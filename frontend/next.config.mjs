const nextConfig = {
  devIndicators: false,
  // other computers on the home Wi-Fi may use the dev server (http://192.168.x.x:3030)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  async redirects() {
    return [
      { source: "/subjects/:id", destination: "/learn/:id", permanent: false },
      { source: "/subjects", destination: "/learn", permanent: false },
      { source: "/analytics", destination: "/progress", permanent: false },
      { source: "/exams/:path*", destination: "/library", permanent: false },
      { source: "/jobs", destination: "/library", permanent: false },
    ];
  },
};
export default nextConfig;
