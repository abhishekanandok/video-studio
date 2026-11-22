"""Real places for films: real borders, rivers, cities and shaded terrain for a region, so a film never invents a map.

  python geo.py --name ganga --bbox 76,21,92,31.5 --zoom 8        writes public/geo/ganga/{map.json, relief.png}

Sources (both free to use; credit them in the film's end card):
  vectors  Natural Earth 1:10m (public domain), cached in geo-cache/
  terrain  AWS Open Data terrain tiles (Terrarium PNG, Mapzen; attribution), cached in geo-cache/tiles/
The relief is in Web Mercator and exactly covers `bbox`, so d3's geoMercator().fitExtent on the same bbox lines both up.
"""
import argparse, io, json, math, os, time, urllib.request

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, "geo-cache")
NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png"


def natural_earth(name):
    path = os.path.join(CACHE, name + ".geojson")
    if not os.path.exists(path):
        os.makedirs(CACHE, exist_ok=True)
        urllib.request.urlretrieve(NE + name + ".geojson", path)
    return json.load(open(path))


def rings(geom):
    t, c = geom["type"], geom["coordinates"]
    if t in ("Polygon", "MultiLineString"):
        return c
    if t == "MultiPolygon":
        return [r for poly in c for r in poly]
    if t == "LineString":
        return [c]
    return []


def touches(geom, bbox, pad=1.0):
    w, s, e, n = bbox
    return any(w - pad <= x <= e + pad and s - pad <= y <= n + pad for r in rings(geom) for x, y in r[:: max(1, len(r) // 200)])


def slim(geom, bbox, pad=3.0):
    """Round to ~100 m, drop repeats, and drop polygon parts far outside the frame (China's coast is not needed for Bihar)."""
    w, s, e, n = bbox
    def ring(r):
        out = []
        for x, y in r:
            p = [round(x, 3), round(y, 3)]
            if not out or out[-1] != p:
                out.append(p)
        return out
    def near(r):
        return any(w - pad <= x <= e + pad and s - pad <= y <= n + pad for x, y in r)
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return {"type": t, "coordinates": [ring(r) for r in c]}
    if t == "MultiPolygon":
        return {"type": t, "coordinates": [[ring(r) for r in poly] for poly in c if near(poly[0])]}
    if t == "LineString":
        return {"type": t, "coordinates": ring(c)}
    if t == "MultiLineString":
        return {"type": t, "coordinates": [ring(r) for r in c if near(r)]}
    return geom


def feature(f, bbox, **props):
    return {"type": "Feature", "properties": props, "geometry": slim(f["geometry"], bbox)}


def chain(lines):
    """Join a river's pieces end to start, so it can be drawn as one stroke from source to mouth."""
    lines = [list(l) for l in lines if len(l) > 1]
    out = []
    while lines:
        cur = lines.pop(0)
        grew = True
        while grew:
            grew = False
            for i, l in enumerate(lines):
                if l[0] == cur[-1]:
                    cur += l[1:]
                elif l[-1] == cur[0]:
                    cur = l + cur[1:]
                else:
                    continue
                lines.pop(i)
                grew = True
                break
        out.append(cur)
    return sorted(out, key=len, reverse=True)


def vectors(bbox):
    """Every country, state, named river and town that shows in bbox, with its real name."""
    w, s, e, n = bbox
    countries = [feature(f, bbox, name=f["properties"]["NAME"]) for f in natural_earth("ne_10m_admin_0_countries")["features"] if touches(f["geometry"], bbox)]
    states = [feature(f, bbox, name=f["properties"]["name"], country=f["properties"]["admin"])
              for f in natural_earth("ne_10m_admin_1_states_provinces")["features"] if touches(f["geometry"], bbox, 0)]
    rivers = {}
    for f in natural_earth("ne_10m_rivers_lake_centerlines")["features"]:
        name = f["properties"].get("name") or ""
        if name and f["geometry"] and touches(f["geometry"], bbox, 0):
            rivers.setdefault(name, []).extend(rings(f["geometry"]))
    rivers = [{"type": "Feature", "properties": {"name": k}, "geometry": slim({"type": "MultiLineString", "coordinates": chain(v)}, bbox)} for k, v in rivers.items()]
    places = [{"name": p["name"], "lon": round(f["geometry"]["coordinates"][0], 3), "lat": round(f["geometry"]["coordinates"][1], 3),
               "pop": p.get("pop_max") or 0, "capital": bool(p.get("adm0cap"))}
              for f in natural_earth("ne_10m_populated_places_simple")["features"] for p in [f["properties"]]
              if w <= f["geometry"]["coordinates"][0] <= e and s <= f["geometry"]["coordinates"][1] <= n]
    places.sort(key=lambda p: -p["pop"])
    return {"bbox": bbox, "countries": countries, "states": states, "rivers": rivers, "places": places}


# ---- terrain ----------------------------------------------------------------------------------------------------

def merc(lon, lat, z):
    """Web Mercator pixel (at 256 px tiles) of a lon/lat at zoom z."""
    k = 256 * 2 ** z
    return (lon + 180) / 360 * k, (1 - math.log(math.tan(math.radians(lat)) + 1 / math.cos(math.radians(lat))) / math.pi) / 2 * k


def tile(z, x, y):
    path = os.path.join(CACHE, "tiles", str(z), str(x), f"{y}.png")
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        for i in range(3):
            try:
                urllib.request.urlretrieve(TILES.format(z=z, x=x, y=y), path)
                break
            except OSError:  # a dropped connection: try again, then give up on this one tile only
                if os.path.exists(path):
                    os.remove(path)
                time.sleep(2 * (i + 1))
        else:
            return Image.new("RGB", (256, 256), (128, 0, 0))  # sea level (128*256 - 32768 = 0 m): one lost tile is flat, not fatal
    return Image.open(path).convert("RGB")


def elevation(bbox, z):
    """Metres above sea for every pixel of bbox, from a mosaic of terrain tiles."""
    w, s, e, n = bbox
    x0, y0 = merc(w, n, z)
    x1, y1 = merc(e, s, z)
    tx0, ty0, tx1, ty1 = int(x0 // 256), int(y0 // 256), int(x1 // 256), int(y1 // 256)
    mosaic = Image.new("RGB", ((tx1 - tx0 + 1) * 256, (ty1 - ty0 + 1) * 256))
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            mosaic.paste(tile(z, tx, ty), ((tx - tx0) * 256, (ty - ty0) * 256))
    crop = mosaic.crop((round(x0 - tx0 * 256), round(y0 - ty0 * 256), round(x1 - tx0 * 256), round(y1 - ty0 * 256)))
    a = np.asarray(crop).astype(np.float32)
    return a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768, (x0, y0)


# A natural atlas ramp: green plains, tan hills, brown mountains, snow peaks.
RAMP = [(-10, (154, 190, 214)), (0, (196, 214, 170)), (150, (176, 196, 148)), (400, (206, 200, 152)), (1200, (190, 160, 120)),
        (2800, (150, 124, 104)), (4600, (176, 160, 140)), (5600, (222, 218, 214)), (6500, (250, 250, 252))]


def tint(h):
    hs = [r[0] for r in RAMP]
    out = np.zeros(h.shape + (3,), np.float32)
    for c in range(3):
        out[..., c] = np.interp(h, hs, [r[1][c] for r in RAMP])
    return out


def shade(h, metres_per_px, az=315, alt=40, exaggerate=3.0):
    gy, gx = np.gradient(h * exaggerate, metres_per_px)
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    a, z = math.radians(az), math.radians(90 - alt)
    return np.clip(np.cos(z) * np.cos(slope) + np.sin(z) * np.sin(slope) * np.cos(a - aspect), 0, 1)


def relief(bbox, z):
    h, origin = elevation(bbox, z)
    lat = (bbox[1] + bbox[3]) / 2
    m = 156543.03 * math.cos(math.radians(lat)) / 2 ** z
    sh = shade(h, m)
    land = tint(h) * (0.55 + 0.6 * sh[..., None])
    sea = np.array([150, 186, 210], np.float32)
    rgb = np.where((h <= 0)[..., None], sea, land)
    return Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)), h, origin


def lowland(h, origin, z, state, below):
    """The real land of `state` lying below `below` metres, as a water overlay: what floods first when a river spills."""
    mask = Image.new("L", (h.shape[1], h.shape[0]), 0)
    draw = ImageDraw.Draw(mask)
    for r in rings(state["geometry"]):
        draw.polygon([(merc(x, y, z)[0] - origin[0], merc(x, y, z)[1] - origin[1]) for x, y in r], fill=255)
    inside = np.asarray(mask) > 0
    depth = np.clip((below - h) / 25, 0, 1)        # deeper below the line, more solid water
    alpha = np.where(inside & (h < below), 110 + 120 * depth, 0).astype(np.uint8)
    rgba = np.zeros(h.shape + (4,), np.uint8)
    rgba[..., :3] = (38, 112, 178)
    rgba[..., 3] = alpha
    return Image.fromarray(rgba, "RGBA")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", required=True)
    ap.add_argument("--bbox", required=True, help="west,south,east,north in degrees")
    ap.add_argument("--zoom", type=int, default=7)
    ap.add_argument("--low", action="append", default=[], help="State:metres, e.g. Bihar:60, writes low-<state>.png")
    a = ap.parse_args()
    bbox = [float(v) for v in a.bbox.split(",")]
    out = os.path.join(HERE, "public", "geo", a.name)
    os.makedirs(out, exist_ok=True)
    img, h, origin = relief(bbox, a.zoom)
    img.save(os.path.join(out, "relief.jpg"), quality=90)
    data = vectors(bbox)
    data["relief"] = {"src": f"geo/{a.name}/relief.jpg", "width": img.width, "height": img.height}
    data["low"] = {}
    for spec in a.low:
        name, below = spec.split(":")
        state = next(s for s in data["states"] if s["properties"]["name"] == name)
        file = f"low-{name.lower().replace(' ', '-')}.png"
        lowland(h, origin, a.zoom, state, float(below)).save(os.path.join(out, file))
        data["low"][name] = {"src": f"geo/{a.name}/{file}", "below": float(below)}
    json.dump(data, open(os.path.join(out, "map.json"), "w"), separators=(",", ":"))
    print(f"{a.name}: relief {img.width}x{img.height}, {len(data['countries'])} countries, {len(data['states'])} states, "
          f"{len(data['rivers'])} rivers, {len(data['places'])} places, map.json {os.path.getsize(os.path.join(out, 'map.json')) // 1024} KB")


if __name__ == "__main__":
    main()
