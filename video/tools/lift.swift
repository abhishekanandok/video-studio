// Lift the main subject (a person, an object) out of a real photo, like "lift subject" in Photos: Apple's Vision
// foreground mask, on this Mac, nothing downloaded. Writes a PNG with a transparent background.
//   swiftc -O tools/lift.swift -o tools/lift && tools/lift in.jpg out.png
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 3, let image = CIImage(contentsOf: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("usage: lift in.jpg out.png\n".data(using: .utf8)!)
    exit(2)
}
let request = VNGenerateForegroundInstanceMaskRequest()
let handler = VNImageRequestHandler(ciImage: image)
do {
    try handler.perform([request])
    guard let result = request.results?.first, !result.allInstances.isEmpty else {
        FileHandle.standardError.write("no subject found\n".data(using: .utf8)!)
        exit(1)
    }
    // one subject only. With two or more prominent people (a speaker beside an interviewer) it refuses rather than guess
    // which one is the person named: the caller then uses another photo, or none
    var best = result.allInstances.first!, bestArea = -1
    var areas: [Int] = []
    for inst in result.allInstances {
        let mask = try result.generateScaledMaskForImage(forInstances: IndexSet(integer: inst), from: handler)
        CVPixelBufferLockBaseAddress(mask, .readOnly)
        let w = CVPixelBufferGetWidth(mask), h = CVPixelBufferGetHeight(mask), row = CVPixelBufferGetBytesPerRow(mask)
        let base = CVPixelBufferGetBaseAddress(mask)!.assumingMemoryBound(to: Float32.self)
        var area = 0
        for y in stride(from: 0, to: h, by: 4) { for x in stride(from: 0, to: w, by: 4) { if base[y * (row / 4) + x] > 0.5 { area += 1 } } }
        CVPixelBufferUnlockBaseAddress(mask, .readOnly)
        areas.append(area)
        if area > bestArea { bestArea = area; best = inst }
    }
    if areas.filter({ Double($0) > 0.2 * Double(bestArea) }).count > 1 {
        FileHandle.standardError.write("several people in the photo\n".data(using: .utf8)!)
        exit(3)
    }
    let buffer = try result.generateMaskedImage(ofInstances: IndexSet(integer: best), from: handler, croppedToInstancesExtent: true)
    let out = CIImage(cvPixelBuffer: buffer)
    let ctx = CIContext()
    try ctx.writePNGRepresentation(of: out, to: URL(fileURLWithPath: args[2]), format: .RGBA8, colorSpace: CGColorSpaceCreateDeviceRGB())
} catch {
    FileHandle.standardError.write("\(error)\n".data(using: .utf8)!)
    exit(1)
}
