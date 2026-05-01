// Compatibility re-export. The implementation lives in accountability/primitives.
// Existing imports from "@/lib/accountability" continue to work; new code
// should import from "@/lib/accountability/primitives" or the higher-level
// "@/lib/accountability/compute".
export * from "./accountability/primitives";
