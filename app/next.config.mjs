/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js Server Actions cap the request body at 1MB by default. Chore
    // proof photos are submitted straight through a Server Action
    // (src/app/child/dashboard/my-chores/actions.ts submitChoreProof), and
    // a real phone camera photo is almost always well over 1MB — so every
    // attempt to attach one was being rejected before it ever reached our
    // code (no error surfaced cleanly, no file ever made it to the
    // chore-proofs storage bucket). Raised above the bucket's own 8MB
    // file_size_limit so that's the real, visible ceiling instead.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
