module.exports = {
  reactStrictMode: false,
}
// module.exports = (phase) => {
//   return {
//     async redirects() {
//       return [
//         {
//           source: "/:entity",
//           destination: "/:entity/dashboard",
//           permanent: false,
//         },
//         {
//           source: "/",
//           destination: "/dashboard",
//           permanent: false,
//         },
//       ];
//     },
//     reactStrictMode: false
//   };
// };
