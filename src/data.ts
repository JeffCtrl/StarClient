export type GameVersion = {
  id: string;
  version: string;
  loader: string;
  status: "Installed" | "Available";
  memory: string;
};

export const initialVersions: GameVersion[] = [
  { id: "fabric-12111", version: "1.21.11", loader: "Fabric", status: "Installed", memory: "4 GB" },
  { id: "vanilla-12111", version: "1.21.11", loader: "Vanilla", status: "Installed", memory: "4 GB" },
  { id: "fabric-263", version: "26.3", loader: "Fabric", status: "Available", memory: "4 GB" }
];

export const initialActivity = [
  { title: "StarClient initialized", detail: "UI prototype ready", time: "Just now", kind: "success" },
  { title: "Profile loaded", detail: "Default profile", time: "Just now", kind: "info" },
  { title: "Minecraft engine", detail: "Not connected yet", time: "Pending", kind: "muted" }
] as const;