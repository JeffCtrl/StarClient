import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { SkinViewer as SkinViewerInstance } from 'skinview3d';
import { 
  Gamepad2, 
  Package, 
  Compass,
  ChevronDown, 
  Check,
  X,
  Puzzle,
  Play,
  Settings,
  Users,
  Plus,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  Settings2,
  Search,
  MoreHorizontal,
  Edit3,
  Key,
  ClipboardCheck,
  Archive,
  AlertCircle,
  Upload,
  Zap,
  Layers,
  ArrowRight,
  Circle,
  Minus,
  SearchCode,
  Wrench,
  FileWarning,
  FileArchive,
  FolderOpen,
  Image as ImageIcon,
  Server,
  History
} from 'lucide-react';
import './styles.css';

import logoImg from './assets/logo.png';
import grassBannerImg from './assets/grassbanner.jpg';
import img5 from './assets/image 5.png';
import img1 from './assets/image 1.png';
import img9 from './assets/image 9.png';

declare global {
  interface Window {
    electronAPI?: {
      launchGame: (config: any) => void;
      stopGame?: () => Promise<{ success: boolean }>;
      openStarClientFolder?: () => Promise<{ success: boolean; error?: string }>;
      installInstance?: (data: { instanceId: string; profileId: string; version: string; loader: string; title: string; gameDir?: string }) => Promise<{ success: boolean; mods?: { projectId: string; name: string; fileName: string; path: string; enabled: boolean }[]; error?: string }>;
      installMod?: (modData: { projectId: string; name: string; version: string; loader: string; category?: string; gameDir?: string; profileId?: string }) => Promise<{ success: boolean; path?: string; fileName?: string; version?: string; files?: { projectId: string; name: string; fileName: string; path: string }[]; error?: string }>;
      installModpack?: (packData: { projectId: string; name: string; version: string; loader: string; gameDir?: string; profileId: string }) => Promise<{ success: boolean; modsInstalled?: number; version?: string; loader?: string; loaderVersion?: string; error?: string }>;
      installDroppedContent?: (data: { files: { path: string; name: string }[]; category: string; profile: InstanceItem & { gameDir?: string }; profileId?: string }) => Promise<{ success: boolean; items?: { name: string; path: string; category: string; profileId?: string; version: string; profile?: InstanceItem }[]; error?: string }>;
      openContentLocation?: (data: { path?: string; profile: InstanceItem & { gameDir?: string } }) => Promise<{ success: boolean; error?: string }>;
      toggleContent?: (data: { path: string; version: string; gameDir?: string; profileId?: string; category?: string; enabled: boolean }) => Promise<{ success: boolean; path?: string; error?: string }>;
      removeContent?: (data: { path: string; version: string; gameDir?: string; profileId?: string; category?: string }) => Promise<{ success: boolean; error?: string }>;
      uploadCustomMod?: (profile: InstanceItem & { gameDir?: string }) => Promise<{ success: boolean; fileName?: string; path?: string; error?: string }>;
      exportInstanceBackup?: (profile: InstanceItem & { gameDir?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
      importInstanceBackup?: () => Promise<{ success: boolean; instance?: any; error?: string }>;
      repairProfile?: (profile: InstanceItem & { gameDir?: string }) => Promise<{ success: boolean; mods?: { projectId: string; name: string; fileName: string; path: string; enabled: boolean }[]; error?: string }>;
      installJavaRuntime?: (majorVersion: number) => Promise<{ success: boolean; path?: string; error?: string }>;
      getCrashReports?: (profile: InstanceItem & { gameDir?: string }) => Promise<{ success: boolean; reports: { name: string; path: string; modifiedAt: string }[]; error?: string }>;
      openCrashReport?: (profile: InstanceItem & { gameDir?: string }, filename: string) => Promise<{ success: boolean; error?: string }>;
      checkForUpdates?: () => Promise<{ hasUpdate: boolean; version?: string; url?: string }>;
      scanJavaVersions?: () => Promise<{ name: string; path: string; majorVersion: number }[]>;
      getInstalledMods?: (version: string) => Promise<{ success: boolean; mods: any[]; error?: string }>;
      deleteMod?: (data: { profile: string; filename: string }) => Promise<{ success: boolean; error?: string }>;
      getStoreData?: (key: string) => Promise<any>;
      setStoreData?: (key: string, value: any) => Promise<void>;
      onConsoleLog: (callback: (log: string) => void) => void;
      onGameClosed?: (callback: (code: number) => void) => void;
      onGameStopped?: (callback: () => void) => void;
      removeConsoleListeners: () => void;
      minimizeWindow?: () => void;
      closeWindow?: () => void;
    };
  }
}

interface ModrinthItem {
  project_id: string;
  title: string;
  description: string;
  icon_url: string;
  downloads: number;
  author: string;
  versionStr?: string;
  enabled?: boolean;
  category?: string;
  path?: string;
  fileName?: string;
  instanceVersion?: string;
  gameDir?: string;
  profileId?: string;
  local?: boolean;
}

interface SavedServer {
  id: string;
  name: string;
  address: string;
  profileId: string;
}

interface CrashReportItem {
  name: string;
  path: string;
  modifiedAt: string;
}

interface CatalogGroupItem {
  id: string;
  title: string;
  subtitle: string;
  versionFamily: '26.x' | '1.21.x' | 'older';
  description: string;
  image: string;
  versions: { label: string; value: string }[];
  loader: string;
  autoMods: ModrinthItem[];
}

interface InstanceItem {
  id: string;
  isolated?: boolean;
  title: string;
  version: string;
  loader: string;
  loaderVersion?: string;
  subtitle: string;
  description: string;
  image: string;
  autoMods: ModrinthItem[];
  ram?: number;
  maxFps?: number;
  lastPlayed?: string;
  javaPath?: string;
  gameDir?: string;
}

interface AccountItem {
  username: string;
  type: 'offline';
}

interface JavaRuntimeItem {
  name: string;
  path: string;
  majorVersion: number;
}

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function HomeSkinPreview({ username }: { username: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isDisposed = false;
    let viewer: SkinViewerInstance | null = null;
    void import('skinview3d').then(async ({ SkinViewer }) => {
      if (isDisposed) return;
      viewer = new SkinViewer({ canvas, width: 220, height: 360 });
      viewer.background = null;
      viewer.controls.enableZoom = false;
      viewer.autoRotate = false;

      try {
        await viewer.loadSkin(`https://minotar.net/skin/${encodeURIComponent(username)}`);
      } catch (error) {
        if (isDisposed || !viewer) return;
        console.warn(`[StarClient] Could not load skin for ${username}; showing the default skin.`, error);
        try {
          await viewer.loadSkin('https://minotar.net/skin/Steve');
        } catch (fallbackError) {
          if (!isDisposed) console.error('[StarClient] Could not load the default player skin:', fallbackError);
        }
      }
    }).catch((error: unknown) => {
      if (!isDisposed) console.error('[StarClient] Could not initialize the 3D skin viewer:', error);
    });

    return () => {
      isDisposed = true;
      viewer?.dispose();
    };
  }, [username]);

  return (
    <div className="home-skin-preview" aria-label={`${username}'s 3D Minecraft skin`}>
      <canvas className="home-skin-canvas" ref={canvasRef} />
    </div>
  );
}

const PERFORMANCE_AUTO_MODS: ModrinthItem[] = [
  { project_id: 'P7dR8mSH', title: 'Fabric API', description: 'Fabric mod library', icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png', downloads: 90000000, author: 'Fabric', enabled: true },
  { project_id: 'AANobbMI', title: 'Sodium', description: 'Rendering optimization', icon_url: 'https://cdn.modrinth.com/data/AANobbMI/icon.png', downloads: 45000000, author: 'jellysquid', enabled: true },
  { project_id: 'gvQqBUqZ', title: 'Lithium', description: 'General optimization', icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png', downloads: 40000000, author: 'jellysquid', enabled: true }
];

const LOADER_OPTIONS_DATA = [
  { id: 'Fabric', name: 'Fabric', subtitle: 'Supported mod loader for StarClient profiles.', badge: 'SUPPORTED', color: '#f5f5f5', icon: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png' }
];

function CustomDropdown({ options, value, onChange, stackOrder = 100 }: { options: { label: string; value: string }[]; value: string; onChange: (val: string) => void; stackOrder?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((opt) => opt.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-dropdown-container" ref={dropdownRef} style={{ position: 'relative', width: '100%', zIndex: isOpen ? stackOrder + 1 : stackOrder }}>
      <button 
        type="button"
        className="custom-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b0b0b', border: '1px solid #292929', padding: '12px 16px', borderRadius: '12px', color: '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown size={18} color="#f5f5f5" />
      </button>

      {isOpen && (
        <div className="custom-dropdown-menu fade-in" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '12px', padding: '8px', zIndex: 9999, maxHeight: '220px', overflowY: 'auto', boxShadow: '0 16px 40px rgba(0,0,0,0.9)' }}>
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-dropdown-option ${option.value === value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              style={{ padding: '10px 14px', borderRadius: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: option.value === value ? '#1a1a1a' : 'transparent', color: '#ffffff', fontWeight: 600, fontSize: '13px', transition: 'background 0.15s ease' }}
            >
              <span>{option.label}</span>
              {option.value === value && <Check size={16} color="#f5f5f5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const CATALOG_GROUPS: CatalogGroupItem[] = [
  {
    id: 'group-26x',
    title: 'StarClient 26.x Series',
    subtitle: 'Next-Gen Experimental Runtime',
    versionFamily: '26.x',
    description: 'Cutting-edge performance builds and next-gen experimental client features.',
    image: img5,
    loader: 'Fabric',
    autoMods: PERFORMANCE_AUTO_MODS,
    versions: [
      { label: '26.3 (Latest Stable Build)', value: '26.3' },
      { label: '26.2 (Secondary Release)', value: '26.2' },
      { label: '26.1 (Initial 26.x Preview)', value: '26.1' }
    ]
  },
  {
    id: 'group-121x',
    title: 'StarClient 1.21.x Series',
    subtitle: 'Trial Chambers Update',
    versionFamily: '1.21.x',
    description: 'Fully optimized survival profiles tailored for all 1.21.x dungeon updates.',
    image: img9,
    loader: 'Fabric',
    autoMods: PERFORMANCE_AUTO_MODS,
    versions: [
      { label: '1.21.11 (Latest Patch)', value: '1.21.11' },
      { label: '1.21.10', value: '1.21.10' },
      { label: '1.21.9', value: '1.21.9' },
      { label: '1.21.8', value: '1.21.8' },
      { label: '1.21.7', value: '1.21.7' },
      { label: '1.21.6', value: '1.21.6' },
      { label: '1.21.5', value: '1.21.5' },
      { label: '1.21.4', value: '1.21.4' },
      { label: '1.21.3', value: '1.21.3' },
      { label: '1.21.2', value: '1.21.2' },
      { label: '1.21.1 (Initial 1.21 Release)', value: '1.21.1' }
    ]
  },
  {
    id: 'group-120x',
    title: 'StarClient 1.20.x Series',
    subtitle: 'Trails & Tales Update',
    versionFamily: 'older',
    description: 'Classic stability profile for 1.20 modded survival servers.',
    image: '',
    loader: 'Fabric',
    autoMods: PERFORMANCE_AUTO_MODS,
    versions: [
      { label: '1.20.4', value: '1.20.4' },
      { label: '1.20.3', value: '1.20.3' },
      { label: '1.20.2', value: '1.20.2' },
      { label: '1.20.1', value: '1.20.1' },
      { label: '1.20 (Trails & Tales)', value: '1.20' }
    ]
  },
  {
    id: 'group-119x',
    title: 'StarClient 1.19.x Series',
    subtitle: 'The Wild Update',
    versionFamily: 'older',
    description: 'Legacy Forge and Fabric profile optimized for deep dark and ancient cities.',
    image: '',
    loader: 'Forge',
    autoMods: PERFORMANCE_AUTO_MODS,
    versions: [
      { label: '1.19.4', value: '1.19.4' },
      { label: '1.19.3', value: '1.19.3' },
      { label: '1.19.2', value: '1.19.2' },
      { label: '1.19.1', value: '1.19.1' },
      { label: '1.19 (The Wild Update)', value: '1.19' }
    ]
  },
  {
    id: 'group-189',
    title: 'StarClient 1.8.9 Series',
    subtitle: 'PvP Legacy Profile',
    versionFamily: 'older',
    description: 'High-performance competitive PvP profile with minimal latency tweaks.',
    image: '',
    loader: 'Forge',
    autoMods: PERFORMANCE_AUTO_MODS,
    versions: [
      { label: '1.8.9 (Standard Competitive)', value: '1.8.9' },
      { label: '1.8.8', value: '1.8.8' },
      { label: '1.8.0', value: '1.8.0' }
    ]
  }
];

const INITIAL_INSTALLED_PROFILES: InstanceItem[] = [
  { 
    id: 'profile-init', 
    title: 'StarClient 1.21.11', 
    subtitle: 'Trial Chambers Update (1.21.11)', 
    version: '1.21.11', 
    loader: 'Fabric', 
    description: 'Optimized survival world mechanics paired with high-performance tweaks.', 
    image: grassBannerImg, 
    autoMods: PERFORMANCE_AUTO_MODS, 
    ram: 4, 
    maxFps: 60, 
    lastPlayed: 'Yesterday' 
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('play');
  const [modsCategory, setModsCategory] = useState<'mods' | 'modpacks' | 'resourcepacks' | 'datapacks' | 'worlds' | 'shaders'>('mods');
  const [modsViewMode, setModsViewMode] = useState<'browse' | 'installed'>('browse');
  
  const [username, setUsername] = useState<string>('Player');
  const [accountType, setAccountType] = useState<'offline'>('offline');
  const [accounts, setAccounts] = useState<AccountItem[]>([{ username: 'Player', type: 'offline' }]);
  const [savedServers, setSavedServers] = useState<SavedServer[]>([]);
  const [serverIcons, setServerIcons] = useState<Record<string, string>>({});
  const requestedServerIcons = useRef(new Set<string>());
  const [newServerName, setNewServerName] = useState('');
  const [newServerAddress, setNewServerAddress] = useState('');
  const [crashReports, setCrashReports] = useState<CrashReportItem[]>([]);
  const [crashReportProfileId, setCrashReportProfileId] = useState<string | null>(null);
  const [javaInstallingVersion, setJavaInstallingVersion] = useState<number | null>(null);

  const [updateAvailable, setUpdateAvailable] = useState<{ version: string; url: string } | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const [isProfilePopoverOpen, setIsProfilePopoverOpen] = useState<boolean>(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState<boolean>(false);
  const [addAccountStep, setAddAccountStep] = useState<'selector' | 'offline'>('selector');
  const [offlineUsernameInput, setOfflineUsernameInput] = useState<string>('');

  const [accountToDelete, setAccountToDelete] = useState<AccountItem | null>(null);

  useEffect(() => {
    if (!isProfilePopoverOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!profilePopoverRef.current?.contains(event.target as Node)) {
        setIsProfilePopoverOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isProfilePopoverOpen]);

  const [settingsSubTab, setSettingsSubTab] = useState<'game' | 'java' | 'servers' | 'console'>('game');
  const [mcVersion, setMcVersion] = useState<string>('1.21.11');
  const [ramAllocation, setRamAllocation] = useState<number>(4);
  const [maxFps, setMaxFps] = useState<number>(60);
  const [resolution, setResolution] = useState<string>('1920x1080');
  const [jvmArgs, setJvmArgs] = useState<string>('-XX:+UseG1GC -XX:+ParallelRefProcEnabled');
  const [gameDir, setGameDir] = useState<string>('');
  const [javaPath, setJavaPath] = useState<string>('java');

  // JAVA AUTO SCANNER STATE FOR SETTINGS
  const [isScanningJava, setIsScanningJava] = useState<boolean>(false);
  const [discoveredJavaList, setDiscoveredJavaList] = useState<JavaRuntimeItem[]>([]);

  const [closeLauncherOnLaunch, setCloseLauncherOnLaunch] = useState<boolean>(false);
  const [enableFullscreen, setEnableFullscreen] = useState<boolean>(false);
  const [show3dSkinView, setShow3dSkinView] = useState<boolean>(true);

  const [consoleFilter, setConsoleFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const [catalogGroups] = useState<CatalogGroupItem[]>(CATALOG_GROUPS);
  const [installedProfiles, setInstalledProfiles] = useState<InstanceItem[]>(INITIAL_INSTALLED_PROFILES);
  const [activeProfileId, setActiveProfileId] = useState<string>('profile-init');

  const [profileSearchQuery, setProfileSearchQuery] = useState<string>('');

  const [selectedInstanceDetail, setSelectedInstanceDetail] = useState<InstanceItem | null>(null);
  const [editingInstance, setEditingInstance] = useState<InstanceItem | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // INSTANCE CREATION WIZARD STATE
  const [activeCatalogGroup, setActiveCatalogGroup] = useState<CatalogGroupItem | null>(null);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [wizardSelectedVersion, setWizardSelectedVersion] = useState<string>('');
  const [wizardSelectedLoader, setWizardSelectedLoader] = useState<string>('Fabric');
  const [wizardProgress, setWizardProgress] = useState<number>(0);
  const [wizardStatusText, setWizardStatusText] = useState<string>('');

  // MOD POP-UP SELECTOR MODAL STATE
  const [selectedModForDownload, setSelectedModForDownload] = useState<ModrinthItem | null>(null);
  const [modalModVersion, setModalModVersion] = useState<string>('26.3');
  const [modalModLoader, setModalModLoader] = useState<string>('Fabric');

  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [launchLogs, setLaunchLogs] = useState<string[]>([
    '[StarClient] Initialized runtime environment',
    '[StarClient] Connected to local IPC bridge successfully.',
    '[Auth] Offline account mode ready'
  ]);
  const logScrollRef = useRef<HTMLDivElement>(null);

  const [modQuery, setModQuery] = useState<string>('');
  const [modsList, setModsList] = useState<ModrinthItem[]>([]);
  const [loadingMods, setLoadingMods] = useState<boolean>(false);
  const [modPage, setModPage] = useState<number>(0);
  const [hasNextModsPage, setHasNextModsPage] = useState<boolean>(false);
  const [downloadingModIds, setDownloadingModIds] = useState<{ [key: string]: boolean }>({});
  const [isBrowseFileDragActive, setIsBrowseFileDragActive] = useState(false);
  const [draggedBrowseFileNames, setDraggedBrowseFileNames] = useState<string[]>([]);
  const [isImportingDroppedFiles, setIsImportingDroppedFiles] = useState(false);
  const [isSelectingInstalledItems, setIsSelectingInstalledItems] = useState(false);
  const [selectedInstalledItemKeys, setSelectedInstalledItemKeys] = useState<string[]>([]);
  const browseFileDragDepth = useRef(0);

  const isAnyModDownloading = Object.values(downloadingModIds).some(Boolean);

  const [installedMods, setInstalledMods] = useState<ModrinthItem[]>([]);
  const [isPersistedStateLoaded, setIsPersistedStateLoaded] = useState(false);
  const storageWarningShown = useRef(false);


  const persistState = async (key: string, value: unknown) => {
    try {
      if (window.electronAPI && window.electronAPI.setStoreData) {
        await window.electronAPI.setStoreData(key, typeof value === 'string' ? value : JSON.stringify(value));
      } else {
        window.localStorage.setItem(`starclient:${key}`, typeof value === 'string' ? value : JSON.stringify(value));
      }
      storageWarningShown.current = false;
    } catch (err) {
      console.error(`[StarClient] Failed to persist ${key}:`, err);
      if (!storageWarningShown.current) {
        storageWarningShown.current = true;
        addToast('Launcher settings could not be saved. Check storage permissions and try again.', 'error');
      }
    }
  };

  // Hydrate all saved values before starting autosave, so defaults cannot overwrite them.
  useEffect(() => {
    const loadProductionState = async () => {
      try {
        const keys = [
          'star_username', 'star_acctype', 'star_accounts', 'star_mcversion', 'star_ram',
          'star_maxfps', 'star_res', 'star_jvm', 'star_gamedir', 'star_javapath',
          'star_profiles', 'star_active_profile', 'star_installed_mods', 'star_servers',
          'star_show_skin_view',
        ];
        let savedState: Record<string, unknown> = {};

        if (window.electronAPI?.getStoreData) {
          const entries = await Promise.all(keys.map(async (key) => [key, await window.electronAPI!.getStoreData!(key)] as const));
          savedState = Object.fromEntries(entries);
        } else {
          savedState = Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(`starclient:${key}`)]));
        }

        const readValue = (key: string): unknown => {
          const value = savedState[key];
          if (typeof value !== 'string') return value;
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        };
        const hasValue = (value: unknown) => value !== undefined && value !== null;

        const savedUsername = readValue('star_username');
        const savedAccounts = readValue('star_accounts');
        const savedVersion = readValue('star_mcversion');
        const savedRam = readValue('star_ram');
        const savedMaxFps = readValue('star_maxfps');
        const savedRes = readValue('star_res');
        const savedJvm = readValue('star_jvm');
        const savedGameDir = readValue('star_gamedir');
        const savedJavaPath = readValue('star_javapath');
        const savedProfiles = readValue('star_profiles');
        const savedActiveId = readValue('star_active_profile');
        const savedMods = readValue('star_installed_mods');
        const savedServers = readValue('star_servers');
        const savedShowSkinView = readValue('star_show_skin_view');

        if (typeof savedUsername === 'string') setUsername(savedUsername);
        if (Array.isArray(savedAccounts)) {
          setAccounts(savedAccounts
            .filter((account): account is { username: string } =>
              typeof account === 'object' &&
              account !== null &&
              'username' in account &&
              typeof account.username === 'string'
            )
            .map(({ username }) => ({ username, type: 'offline' })));
        }
        if (typeof savedVersion === 'string') setMcVersion(savedVersion);
        if (hasValue(savedRam) && Number.isFinite(Number(savedRam))) setRamAllocation(Number(savedRam));
        if (hasValue(savedMaxFps) && Number.isFinite(Number(savedMaxFps))) setMaxFps(Number(savedMaxFps));
        if (typeof savedRes === 'string') setResolution(savedRes);
        if (typeof savedJvm === 'string') setJvmArgs(savedJvm);
        if (typeof savedGameDir === 'string') setGameDir(savedGameDir);
        if (typeof savedJavaPath === 'string') setJavaPath(savedJavaPath);
        if (Array.isArray(savedServers)) setSavedServers(savedServers);
        if (typeof savedShowSkinView === 'boolean') setShow3dSkinView(savedShowSkinView);
        if (Array.isArray(savedProfiles)) {
          setInstalledProfiles(savedProfiles);
          if (typeof savedActiveId === 'string' && savedProfiles.some((profile: InstanceItem) => profile.id === savedActiveId)) {
            setActiveProfileId(savedActiveId);
          } else if (savedProfiles.length > 0) {
            setActiveProfileId(savedProfiles[0].id);
          } else {
            setActiveProfileId('');
          }
        }
        if (Array.isArray(savedMods)) {
          setInstalledMods(savedMods.filter((mod: ModrinthItem) =>
            typeof mod?.project_id === 'string' &&
            (mod.category === 'modpack' || (Boolean(mod.path) && Boolean(mod.instanceVersion)))
          ));
        }

        setIsPersistedStateLoaded(true);
      } catch (err) {
        console.error('[StarClient] Failed to load persisted state; autosave remains disabled to protect saved data:', err);
        addToast('Could not load saved launcher data. Autosave is paused to protect it.', 'error');
      }

      try {
        if (window.electronAPI?.checkForUpdates) {
          const updateRes = await window.electronAPI.checkForUpdates();
          if (updateRes?.hasUpdate && updateRes.version && updateRes.url) {
            setUpdateAvailable({ version: updateRes.version, url: updateRes.url });
          }
        }
      } catch (err) {
        console.error('[StarClient] Failed to check for updates:', err);
      }
    };
    loadProductionState();
  }, []);

  // PERSIST STATE ONLY AFTER startup hydration has completed.
  useEffect(() => {
    if (!isPersistedStateLoaded) return;
    persistState('star_username', username);
    persistState('star_acctype', accountType);
    persistState('star_accounts', accounts);
    persistState('star_mcversion', mcVersion);
    persistState('star_ram', ramAllocation);
    persistState('star_maxfps', maxFps);
    persistState('star_res', resolution);
    persistState('star_jvm', jvmArgs);
    persistState('star_gamedir', gameDir);
    persistState('star_javapath', javaPath);
    persistState('star_profiles', installedProfiles);
    persistState('star_active_profile', activeProfileId);
    persistState('star_installed_mods', installedMods);
    persistState('star_servers', savedServers);
    persistState('star_show_skin_view', show3dSkinView);
  }, [isPersistedStateLoaded, username, accountType, accounts, mcVersion, ramAllocation, maxFps, resolution, jvmArgs, gameDir, javaPath, installedProfiles, activeProfileId, installedMods, savedServers, show3dSkinView]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-menu-container')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const handleTabChange = (tab: string) => {
    setOpenMenuId(null);
    setActiveTab(tab);
  };

  const versionOptions = [
    { label: '26.3 (Latest Stable)', value: '26.3' },
    { label: '26.2', value: '26.2' },
    { label: '26.1', value: '26.1' },
    { label: '1.21.11 (Trial Chambers)', value: '1.21.11' },
    { label: '1.21.10', value: '1.21.10' },
    { label: '1.20.4 (Trails & Tales)', value: '1.20.4' },
    { label: '1.19.4 (The Wild Update)', value: '1.19.4' },
    { label: '1.8.9 (PvP Legacy)', value: '1.8.9' }
  ];

  const resolutionOptions = [
    { label: '1920 x 1080 (16:9 Full HD)', value: '1920x1080' },
    { label: '1280 x 720 (16:9 HD)', value: '1280x720' },
  ];

  useEffect(() => {
    if (logScrollRef.current) logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [launchLogs]);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onConsoleLog((log) => {
        if (log.includes('Exception in thread') || log.includes('FATAL ERROR') || log.includes('CrashReport')) {
          setLaunchLogs((prev) => [...prev, `[CrashDiagnostics] CRASH DETECTED: Review stack trace below or check active mods.`]);
          addToast('Crash detected in game process!', 'error');
        }
        setLaunchLogs((prev) => [...prev, log]);
      });
      if (window.electronAPI.onGameClosed) {
        window.electronAPI.onGameClosed((code) => {
          setIsLaunching(false);
          setLaunchLogs((prev) => [...prev, `[StarClient] Game exited with code ${code}.`]);
          addToast('Minecraft session ended.', 'info');
        });
      }
      if (window.electronAPI.onGameStopped) {
        window.electronAPI.onGameStopped(() => {
          setIsLaunching(false);
          setLaunchLogs((prev) => [...prev, `[StarClient] Game process stopped.`]);
        });
      }
    }
    return () => { if (window.electronAPI) window.electronAPI.removeConsoleListeners(); };
  }, []);

  const handleScanJavaInstallations = async () => {
    setIsScanningJava(true);
    setLaunchLogs((prev) => [...prev, '[JavaScanner] Scanning system directories & registry for Java runtimes...']);
    addToast('Scanning system for Java installations...', 'info');

    try {
      if (window.electronAPI && window.electronAPI.scanJavaVersions) {
        const results = await window.electronAPI.scanJavaVersions();
        setDiscoveredJavaList(results || []);
        setLaunchLogs((prev) => [...prev, `[JavaScanner] Found ${results?.length || 0} Java runtimes.`]);
        addToast(results?.length ? `Discovered ${results.length} Java runtimes!` : 'No Java runtimes detected. Install one below.', 'info');
      } else {
        throw new Error('Java scanning is only available in the desktop launcher.');
      }
    } catch (err: any) {
      setLaunchLogs((prev) => [...prev, `[JavaScanner Error] ${err.message || err}`]);
      addToast('Java scan failed.', 'error');
    } finally {
      setIsScanningJava(false);
    }
  };

  const handleLaunchGame = (quickPlayServer?: SavedServer) => {
    if (isLaunching) {
      // If already launching/running, trigger stop game
      handleStopGame();
      return;
    }

    setIsLaunching(true);
    setActiveTab('settings');
    setSettingsSubTab('console');
    setLaunchLogs((prev) => [...prev, `[StarClient] Launching Minecraft ${mcVersion} with user ${username} (${accountType})...`]);
    addToast('Starting Minecraft runtime environment...');

    if (window.electronAPI) {
      const activeProfile = installedProfiles.find((profile) => profile.id === (quickPlayServer?.profileId || activeProfileId));
      window.electronAPI.launchGame({ 
        username, 
        accountType, 
        version: activeProfile?.version || mcVersion, 
        loader: activeProfile?.loader || 'Fabric',
        loaderVersion: activeProfile?.loaderVersion,
        profileId: activeProfile?.isolated ? activeProfile.id : undefined,
        ram: activeProfile?.ram || ramAllocation, 
        maxFps: activeProfile?.maxFps || maxFps,
        gameDir: activeProfile?.gameDir || gameDir,
        javaPath: activeProfile?.javaPath || javaPath,
        fullscreen: enableFullscreen,
        jvmArgs: jvmArgs.split(/\s+/).filter(Boolean),
        quickPlay: quickPlayServer ? {
          type: (() => {
            const parts = (activeProfile?.version || mcVersion).split('.').map(Number);
            return parts[0] > 1 || (parts[0] === 1 && parts[1] >= 20) ? 'multiplayer' : 'legacy';
          })(),
          identifier: quickPlayServer.address
        } : undefined
      });
    }
  };

  const handleStopGame = async () => {
    setLaunchLogs((prev) => [...prev, `[StarClient] Requesting game termination...`]);
    addToast('Stopping game process...', 'info');
    if (!window.electronAPI?.stopGame) {
      addToast('Stopping Minecraft is only available in the desktop launcher.', 'error');
      return;
    }
    try {
      const result = await window.electronAPI.stopGame();
      if (!result.success) throw new Error('No running Minecraft process could be stopped.');
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleInstallJavaRuntime = async (majorVersion: number) => {
    if (!window.electronAPI?.installJavaRuntime) {
      addToast('Java installation is only available in the desktop launcher.', 'error');
      return;
    }
    setJavaInstallingVersion(majorVersion);
    try {
      const result = await window.electronAPI.installJavaRuntime(majorVersion);
      if (!result.success || !result.path) throw new Error(result.error || `Java ${majorVersion} installation failed.`);
      setJavaPath(result.path);
      addToast(`Java ${majorVersion} was installed and selected.`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setJavaInstallingVersion(null);
    }
  };

  const handleRepairProfile = async (profile: InstanceItem) => {
    if (!window.electronAPI?.repairProfile) return addToast('Profile repair is only available in the desktop launcher.', 'error');
    try {
      const result = await window.electronAPI.repairProfile({ ...profile, gameDir });
      if (!result.success) throw new Error(result.error || 'Profile repair failed.');
      setInstalledMods((current) => [
        ...current.filter((item) => item.profileId !== profile.id &&
          (profile.isolated || item.instanceVersion !== profile.version)),
        ...(result.mods || []).map((mod) => {
          const metadata = PERFORMANCE_AUTO_MODS.find((item) => item.project_id === mod.projectId);
          return {
            ...(metadata || { project_id: mod.projectId, title: mod.name, description: 'Installed performance mod.', icon_url: '', downloads: 0, author: 'StarClient' }),
            path: mod.path,
            fileName: mod.fileName,
            category: 'mods',
            instanceVersion: profile.version,
            gameDir: profile.gameDir || gameDir,
            profileId: profile.isolated ? profile.id : undefined,
            enabled: true
          };
        })
      ]);
      addToast(`Repaired ${profile.title}.`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleLoadCrashReports = async (profile: InstanceItem) => {
    if (!window.electronAPI?.getCrashReports) return addToast('Crash reports are only available in the desktop launcher.', 'error');
    try {
      const result = await window.electronAPI.getCrashReports({ ...profile, gameDir });
      if (!result.success) throw new Error(result.error || 'Could not load crash reports.');
      setCrashReports(result.reports);
      setCrashReportProfileId(profile.id);
      addToast(result.reports.length ? `Found ${result.reports.length} crash report(s).` : 'No crash reports found.', 'info');
      setActiveTab('settings');
      setSettingsSubTab('console');
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleOpenCrashReport = async (filename: string) => {
    const profile = installedProfiles.find((item) => item.id === crashReportProfileId);
    if (!profile || !window.electronAPI?.openCrashReport) return;
    try {
      const result = await window.electronAPI.openCrashReport({ ...profile, gameDir }, filename);
      if (!result.success) throw new Error(result.error || 'Could not open crash report.');
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleSaveServer = () => {
    const profile = installedProfiles.find((item) => item.id === activeProfileId);
    if (!profile) return addToast('Create or select a profile before saving a server.', 'error');
    const name = newServerName.trim();
    const address = newServerAddress.trim();
    const addressMatch = /^([a-z0-9.-]+|\[[0-9a-f:]+\])(?::(\d{1,5}))?$/i.exec(address);
    if (!name || !addressMatch || (addressMatch[2] && (Number(addressMatch[2]) < 1 || Number(addressMatch[2]) > 65535))) {
      return addToast('Enter a server name and valid host[:port].', 'error');
    }
    setSavedServers((items) => [...items, { id: crypto.randomUUID(), name, address, profileId: profile.id }]);
    setNewServerName('');
    setNewServerAddress('');
  };

  const handleAddOfflineAccount = () => {
    if (!offlineUsernameInput.trim()) return;
    const name = offlineUsernameInput.trim();

    const newAccount: AccountItem = { username: name, type: 'offline' };
    if (!accounts.some((acc) => acc.username === name)) {
      setAccounts((prev) => [...prev, newAccount]);
    }

    setUsername(name);
    setAccountType('offline');
    setLaunchLogs((prev) => [...prev, `[Auth] Added offline account: ${name}`]);
    addToast(`Added offline profile: ${name}`);

    setIsAddAccountModalOpen(false);
    setOfflineUsernameInput('');
    setAddAccountStep('selector');
  };

  const handleSwitchAccount = (acc: AccountItem) => {
    setUsername(acc.username);
    setAccountType(acc.type);
    setIsProfilePopoverOpen(false);
    setLaunchLogs((prev) => [...prev, `[Auth] Switched active account to ${acc.username} (${acc.type})`]);
    addToast(`Switched to ${acc.username}`);
  };

  const handleExportBackup = async (inst: InstanceItem) => {
    setLaunchLogs((prev) => [...prev, `[Backup] Exporting backup archive for ${inst.title}...`]);
    try {
      if (window.electronAPI && window.electronAPI.exportInstanceBackup) {
        const res = await window.electronAPI.exportInstanceBackup({ ...inst, gameDir });
        if (!res.success) throw new Error(res.error || 'Backup export failed.');
        setLaunchLogs((prev) => [...prev, `[Backup] Backup successfully exported to ${res.path || 'disk'}!`]);
        addToast(`Backup exported for "${inst.title}"!`);
      } else {
        throw new Error('Profile backup export is only available in the desktop launcher.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLaunchLogs((prev) => [...prev, `[Backup] Export failed: ${message}`]);
      addToast(message, 'error');
    }
  };

  const handleImportBackup = async () => {
    setLaunchLogs((prev) => [...prev, `[Backup] Selecting backup archive to import...`]);
    try {
      if (window.electronAPI && window.electronAPI.importInstanceBackup) {
        const res = await window.electronAPI.importInstanceBackup();
        if (res.success && res.instance) {
          setInstalledProfiles((prev) => [res.instance, ...prev]);
          setLaunchLogs((prev) => [...prev, `[Backup] Successfully imported profile "${res.instance.title}"!`]);
          addToast(`Imported profile: ${res.instance.title}`);
        } else {
          throw new Error(res.error || 'Could not import profile backup.');
        }
      } else {
        throw new Error('Profile backup import is only available in the desktop launcher.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLaunchLogs((prev) => [...prev, `[Backup] Import failed: ${message}`]);
      addToast(message, 'error');
    }
  };

  const handleUploadCustomFile = async () => {
    const profile = installedProfiles.find((item) => item.id === activeProfileId);
    if (!profile || !window.electronAPI?.uploadCustomMod) {
      addToast('Local mod import is only available in the desktop launcher with a selected profile.', 'error');
      return;
    }
    const res = await window.electronAPI.uploadCustomMod({ ...profile, gameDir });
    if (!res.success || !res.fileName || !res.path) {
      if (res.error && res.error !== 'Mod import cancelled.') addToast(res.error, 'error');
      return;
    }
    const profileId = profile.isolated ? profile.id : undefined;
    const newCustomItem: ModrinthItem = {
      project_id: `custom-${Date.now()}`,
      title: res.fileName,
      description: 'Locally imported Fabric mod.',
      icon_url: 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png',
      downloads: 1,
      author: 'You (Local)',
      category: 'mods',
      path: res.path,
      fileName: res.fileName,
      instanceVersion: profile.version,
      profileId,
      gameDir: profile.gameDir || gameDir,
      enabled: true
    };

    setInstalledMods((prev) => [...prev, newCustomItem]);
    setLaunchLogs((prev) => [...prev, `[ModManager] Successfully added local file: ${res.fileName}!`]);
    addToast(`Added local mod: ${res.fileName}`);
  };

  const handleBrowseFileDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    browseFileDragDepth.current = 0;
    setIsBrowseFileDragActive(false);
    setDraggedBrowseFileNames([]);
    if (isImportingDroppedFiles) return;

    const profile = installedProfiles.find((item) => item.id === activeProfileId);
    if (!profile || !window.electronAPI?.installDroppedContent) {
      addToast('Select an installed profile before importing files.', 'error');
      return;
    }

    const files = Array.from(event.dataTransfer.files).map((file) => ({
      path: (file as File & { path?: string }).path || '',
      name: file.name
    }));
    if (!files.length || files.some((file) => !file.path)) {
      addToast('The dropped files could not be accessed. Drop files from your computer into Browse.', 'error');
      return;
    }

    const modpackProfileId = modsCategory === 'modpacks' ? `dropped-pack-${crypto.randomUUID()}` : undefined;
    setIsImportingDroppedFiles(true);
    try {
      const result = await window.electronAPI.installDroppedContent({
        files,
        category: modsCategory,
        profile: { ...profile, gameDir },
        profileId: modpackProfileId
      });
      if (!result.items?.length) throw new Error(result.error || 'The dropped content could not be installed.');

      const addedProfiles = result.items.flatMap((item) => item.profile ? [item.profile] : []);
      if (addedProfiles.length) {
        setInstalledProfiles((current) => [...addedProfiles, ...current]);
        const pack = addedProfiles[0];
        setInstalledMods((current) => [...current, {
          project_id: `local-${crypto.randomUUID()}`,
          title: pack.title,
          description: pack.description || 'Imported local Modrinth modpack.',
          icon_url: '',
          downloads: 0,
          author: 'Local file',
          versionStr: pack.version,
          category: 'modpack',
          path: result.items?.find((item) => item.profileId === pack.id)?.path,
          instanceVersion: pack.version,
          gameDir,
          profileId: pack.id,
          local: true,
          enabled: true
        }]);
      }

      const normalItems = result.items.filter((item) => !item.profile);
      if (normalItems.length) {
        const categoryTitles: Record<string, string> = {
          mods: 'Locally imported Fabric file.',
          resourcepacks: 'Locally imported Java resource pack.',
          shaders: 'Locally imported shader pack.',
          datapacks: 'Locally imported data pack.',
          worlds: 'Locally imported Minecraft world.'
        };
        setInstalledMods((current) => [...current, ...normalItems.map((item) => ({
          project_id: `local-${crypto.randomUUID()}`,
          title: item.name,
          description: categoryTitles[item.category] || 'Locally imported Minecraft content.',
          icon_url: '',
          downloads: 0,
          author: 'Local file',
          category: item.category,
          path: item.path,
          fileName: item.name,
          versionStr: item.version,
          instanceVersion: item.version,
          gameDir,
          profileId: item.profileId,
          local: true,
          enabled: true
        }))]);
      }
      setModsViewMode('installed');
      if (!result.success) throw new Error(result.error || 'Some files could not be installed.');
      addToast(`Installed ${result.items.length} file${result.items.length === 1 ? '' : 's'} and opened the destination folder.`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setIsImportingDroppedFiles(false);
    }
  };

  const handleToggleModEnabled = (item: ModrinthItem) => {
    if (!item.path || !window.electronAPI?.toggleContent) {
      addToast('This item cannot be toggled as a single file.', 'error');
      return;
    }

    const nextState = item.enabled === false;
    void window.electronAPI.toggleContent({
      path: item.path,
      version: item.instanceVersion || mcVersion,
      gameDir: item.gameDir ?? gameDir,
      profileId: item.profileId,
      category: item.category,
      enabled: nextState
    }).then((result) => {
      if (!result.success || !result.path) throw new Error(result.error || 'Could not change the item state.');
      setInstalledMods((prev) => prev.map((mod) => mod.path === item.path
        ? { ...mod, enabled: nextState, path: result.path }
        : mod));
      setLaunchLogs((logs) => [...logs, `[ModManager] ${nextState ? 'Enabled' : 'Disabled'} item: ${item.title}`]);
    }).catch((err: Error) => {
      addToast(err.message, 'error');
    });
  };

  const getInstalledItemKey = (item: ModrinthItem) => `${item.project_id}:${item.path || item.profileId || item.title}`;

  const handleRemoveSelectedContent = async () => {
    const selectedItems = activeProfileMods.filter((item) =>
      item.path &&
      item.category !== 'modpack' &&
      selectedInstalledItemKeys.includes(getInstalledItemKey(item))
    );
    if (!selectedItems.length || !window.electronAPI?.removeContent) return;
    if (!window.confirm(`Remove ${selectedItems.length} selected item${selectedItems.length === 1 ? '' : 's'}?`)) return;

    const removedPaths: string[] = [];
    const failures: string[] = [];
    for (const item of selectedItems) {
      try {
        const result = await window.electronAPI.removeContent({
          path: item.path!,
          version: item.instanceVersion || mcVersion,
          gameDir: item.gameDir ?? gameDir,
          profileId: item.profileId,
          category: item.category
        });
        if (!result.success) throw new Error(result.error || 'Could not remove this item.');
        removedPaths.push(item.path!);
        setLaunchLogs((prev) => [...prev, `[ModManager] Removed item: ${item.title}`]);
      } catch (error) {
        failures.push(`${item.title}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    if (removedPaths.length) {
      setInstalledMods((prev) => prev.filter((item) => !removedPaths.includes(item.path || '')));
      addToast(`Removed ${removedPaths.length} item${removedPaths.length === 1 ? '' : 's'}.`, 'info');
    }
    setSelectedInstalledItemKeys([]);
    if (failures.length) addToast(`Could not remove ${failures.length} item${failures.length === 1 ? '' : 's'}.`, 'error');
  };

  const handleOpenStarClientFolder = async () => {
    if (!window.electronAPI?.openStarClientFolder) {
      addToast('Opening the StarClient folder is only available in the desktop launcher.', 'error');
      return;
    }
    try {
      const result = await window.electronAPI.openStarClientFolder();
      if (!result.success) throw new Error(result.error || 'Could not open the StarClient folder.');
    } catch (err) {
      addToast(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleConfirmLogout = () => {
    if (!accountToDelete) return;

    const targetName = accountToDelete.username;
    const remainingAccounts = accounts.filter((acc) => acc.username !== targetName);
    setAccounts(remainingAccounts);

    setLaunchLogs((prev) => [...prev, `[Auth] Logged out and removed account: ${targetName}`]);
    addToast(`Removed account ${targetName}`, 'info');

    if (username === targetName) {
      if (remainingAccounts.length > 0) {
        setUsername(remainingAccounts[0].username);
        setAccountType(remainingAccounts[0].type);
      } else {
        setUsername('Player');
        setAccountType('offline');
      }
    }

    setAccountToDelete(null);
  };

  const handleStartWizardCreation = async () => {
    if (!activeCatalogGroup) return;
    const group = activeCatalogGroup;
    const ver = wizardSelectedVersion;
    const loader = wizardSelectedLoader;
    const exactTitle = `StarClient ${ver}`;
    const profileId = `profile-${crypto.randomUUID()}`;

    setWizardStep(4);
    setWizardProgress(15);
    setWizardStatusText(`Downloading compatible Fabric mods for ${ver}...`);
    setLaunchLogs((prev) => [...prev, `[Installer] Starting installation for ${exactTitle} (${ver} - ${loader})...`]);

    try {
      if (!window.electronAPI?.installInstance) throw new Error('Instance installation is only available in the desktop launcher.');
      const result = await window.electronAPI.installInstance({ instanceId: group.id, profileId, version: ver, loader, title: exactTitle, gameDir });
      if (!result.success) throw new Error(result.error || 'Instance installation failed');
      setWizardProgress(100);
      setWizardStatusText('Profile mods are ready. Minecraft game files download the first time you launch.');
      setLaunchLogs((prev) => [...prev, `[Installer] Installed ${result.mods?.length || 0} compatible core mods. Minecraft game files will download on first launch.`]);
      setInstalledMods((result.mods || []).map((mod) => {
        const metadata = PERFORMANCE_AUTO_MODS.find((item) => item.project_id === mod.projectId);
        return {
        ...(metadata || { project_id: mod.projectId, title: mod.name, description: 'Installed performance mod.', icon_url: '', downloads: 0, author: 'StarClient' }),
        path: mod.path,
        fileName: mod.fileName,
        category: 'mods',
        versionStr: ver,
        instanceVersion: ver,
        gameDir,
        profileId,
        enabled: mod.enabled
        };
      }));

      const newInstance: InstanceItem = {
        id: profileId,
        isolated: true,
        title: exactTitle,
        subtitle: `${group.subtitle} (${ver}) • ${loader}`,
        version: ver,
        loader: loader,
        description: group.description,
        image: grassBannerImg,
        autoMods: PERFORMANCE_AUTO_MODS,
        ram: 4,
        maxFps: 60,
        lastPlayed: 'Just now',
        gameDir
      };

      setInstalledProfiles((prev) => [newInstance, ...prev]);
      setActiveProfileId(newInstance.id);
      setMcVersion(ver);
      setActiveCatalogGroup(null);
      setWizardStep(1);
      setActiveTab('mods');
      setModsViewMode('installed');
      addToast(`Profile mods installed. Minecraft ${ver} files will download on first launch.`, 'info');
    } catch (err) {
      addToast('Profile installation failed.', 'error');
      setActiveCatalogGroup(null);
      setWizardStep(1);
    }
  };

  const handleConfirmModDownloadFromModal = async () => {
    if (!selectedModForDownload) return;
    const item = selectedModForDownload;
    const chosenVersion = modalModVersion;
    const chosenLoader = modalModLoader;

    setSelectedModForDownload(null);

    if (isAnyModDownloading) return;
    if (downloadingModIds[item.project_id] !== undefined) return;
    if (installedMods.some((m) => m.project_id === item.project_id)) return;

    setDownloadingModIds((prev) => ({ ...prev, [item.project_id]: true }));
    setLaunchLogs((prev) => [...prev, `[ModManager] Downloading "${item.title}" version ${chosenVersion} (${chosenLoader} - ${modsCategory})...`]);

    try {
      if (modsCategory === 'modpacks') {
        if (!window.electronAPI?.installModpack) throw new Error('Modpack installation is only available in the desktop launcher.');
        const packProfileId = `pack-${crypto.randomUUID()}`;
        const res = await window.electronAPI.installModpack({
          projectId: item.project_id,
          name: item.title,
          version: chosenVersion,
          loader: chosenLoader,
          gameDir,
          profileId: packProfileId
        });
        if (!res.success) throw new Error(res.error || 'Modpack installation failed');

        const newPackInstance: InstanceItem = {
          id: packProfileId,
          isolated: true,
          title: item.title,
          version: res.version || chosenVersion,
          loader: res.loader || chosenLoader,
          loaderVersion: res.loaderVersion,
          subtitle: `${item.title} (${res.version || chosenVersion}) • ${res.loader || chosenLoader}`,
          description: item.description || 'Imported modpack profile.',
          image: grassBannerImg,
          autoMods: [],
          ram: 4,
          maxFps: 60,
          lastPlayed: 'Just now',
          gameDir
        };
        setInstalledMods((prev) => [...prev, {
          ...item,
          versionStr: `${res.modsInstalled || 0} files installed`,
          category: 'modpack',
          instanceVersion: res.version || chosenVersion,
          gameDir,
          profileId: packProfileId,
          enabled: true
        }]);
        setInstalledProfiles((prev) => [newPackInstance, ...prev]);
        setActiveProfileId(newPackInstance.id);
        setMcVersion(res.version || chosenVersion);
      } else {
        if (!window.electronAPI?.installMod) throw new Error('Content installation is only available in the desktop launcher.');
        const res = await window.electronAPI.installMod({
          projectId: item.project_id,
          name: item.title,
          version: chosenVersion,
          loader: chosenLoader,
          category: modsCategory,
          gameDir,
          profileId: installedProfiles.find((profile) => profile.id === activeProfileId)?.isolated ? activeProfileId : undefined
        });
        if (!res.success) throw new Error(res.error || 'Content installation failed');
        const installedFiles = res.files?.length ? res.files : [{
          projectId: item.project_id,
          name: item.title,
          fileName: res.fileName || '',
          path: res.path || ''
        }];
        setInstalledMods((curr) => [...curr, ...installedFiles.map((file, index) => ({
          ...item,
          project_id: file.projectId,
          title: index === 0 ? item.title : file.name,
          versionStr: chosenVersion,
          category: modsCategory,
          path: file.path,
          fileName: file.fileName,
          instanceVersion: chosenVersion,
          gameDir,
          profileId: installedProfiles.find((profile) => profile.id === activeProfileId)?.isolated ? activeProfileId : undefined,
          enabled: true
        }))]);
      }

      setDownloadingModIds((prev) => {
        const next = { ...prev };
        delete next[item.project_id];
        return next;
      });
      setLaunchLogs((prev) => [...prev, `[ModManager] Successfully downloaded: ${item.title} (${chosenVersion} - ${chosenLoader})`]);
      addToast(`Successfully installed ${item.title} (${chosenVersion})!`);

    } catch (err: any) {
      setLaunchLogs((prev) => [...prev, `[ModManager Error] ${err.message || err}`]);
      addToast('Download failed.', 'error');
      setDownloadingModIds((prev) => {
        const next = { ...prev };
        delete next[item.project_id];
        return next;
      });
    }
  };

  const handleSaveEditedInstance = () => {
    if (!editingInstance) return;
    setInstalledProfiles((prev) => prev.map((inst) => inst.id === editingInstance.id ? editingInstance : inst));
    setEditingInstance(null);
    addToast('Profile changes saved!');
  };

  const handleDeleteInstance = (id: string) => {
    setInstalledProfiles((prev) => prev.filter((inst) => inst.id !== id));
    if (activeProfileId === id) {
      const remaining = installedProfiles.filter((inst) => inst.id !== id);
      if (remaining.length > 0) setActiveProfileId(remaining[0].id);
    }
    setEditingInstance(null);
    setSelectedInstanceDetail(null);
    setOpenMenuId(null);
    addToast('Profile deleted successfully.', 'info');
  };

  const fetchModrinthContent = async (query: string = '', page: number = 0, category: string = 'mods') => {
    setLoadingMods(true);
    try {
      const offset = page * 24;
      let projectType = 'mod';
      if (category === 'modpacks') projectType = 'modpack';
      else if (category === 'resourcepacks') projectType = 'resourcepack';
      else if (category === 'datapacks') projectType = 'datapack';
      else if (category === 'shaders') projectType = 'shader';
      else if (category === 'worlds') projectType = 'world';

      const facetQuery = `&facets=[["project_type:${projectType}"]]`;
      const res = await fetch(`https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&limit=24&offset=${offset}${facetQuery}`);
      const data = await res.json();
      const hits = Array.isArray(data.hits) ? data.hits : [];
      setModsList(hits);
      setHasNextModsPage(hits.length === 24);
    } catch (err) {
      console.error('API Error:', err);
      setModsList([]);
      setHasNextModsPage(false);
    } finally {
      setLoadingMods(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mods' && modsViewMode === 'browse') fetchModrinthContent(modQuery, modPage, modsCategory);
  }, [activeTab, modPage, modsCategory, modsViewMode]);

  const sidebarRef = useRef<HTMLElement>(null);
  const navRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [navIndicator, setNavIndicator] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const update = () => {
      const el = navRefs.current[activeTab as string];
      const sb = sidebarRef.current;
      if (!el || !sb) { setNavIndicator(null); return; }
      const s = sb.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setNavIndicator({ x: r.left - s.left - sb.clientLeft, y: r.top - s.top - sb.clientTop, w: r.width, h: r.height });
    };
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', update); };
  }, [activeTab]);

  const filteredProfiles = installedProfiles.filter((inst) => 
    inst.title.toLowerCase().includes(profileSearchQuery.toLowerCase()) ||
    inst.subtitle.toLowerCase().includes(profileSearchQuery.toLowerCase())
  );
  const activeProfile = installedProfiles.find((profile) => profile.id === activeProfileId);
  const activeProfileMods = installedMods.filter((item) =>
    item.profileId ? item.profileId === activeProfileId : item.instanceVersion === activeProfile?.version
  );
  const homeServers = savedServers.slice(-3).reverse();
  const handleModsCategoryChange = (category: typeof modsCategory) => {
    setModsCategory(category);
    setModPage(0);
    setSelectedInstalledItemKeys([]);
  };

  useEffect(() => {
    homeServers.forEach((server) => {
      if (requestedServerIcons.current.has(server.id)) return;
      requestedServerIcons.current.add(server.id);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5000);
      void fetch(`https://api.mcstatus.io/v2/status/java/${encodeURIComponent(server.address)}`, { signal: controller.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Server icon lookup failed with HTTP ${response.status}.`);
          return response.json() as Promise<{ icon?: string | null }>;
        })
        .then((data) => {
          if (data.icon) setServerIcons((icons) => ({ ...icons, [server.id]: data.icon! }));
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            console.warn(`[StarClient] Could not load icon for server ${server.name}:`, error);
          }
        })
        .finally(() => window.clearTimeout(timeout));
    });
  }, [savedServers]);

  const avatarHeadUrl = `https://minotar.net/helm/${username}/64.png`;
  const renderBrowsePagination = (position: 'top' | 'bottom') => (
    <div className={`browse-pagination browse-pagination-${position}`} aria-label={`${position} browse pagination`}>
      <button
        className="browse-page-button"
        disabled={modPage === 0 || loadingMods}
        onClick={() => setModPage((page) => Math.max(0, page - 1))}
      >
        <ChevronLeft size={17} /> Previous
      </button>
      <span className="browse-page-indicator">Page <strong>{modPage + 1}</strong></span>
      <button
        className="browse-page-button primary"
        disabled={!hasNextModsPage || loadingMods}
        onClick={() => setModPage((page) => page + 1)}
      >
        Next <ChevronRight size={17} />
      </button>
    </div>
  );

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#060606', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <div style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
        {toasts.map((t) => (
          <div key={t.id} className="fade-in" style={{ pointerEvents: 'auto', background: t.type === 'error' ? '#fecaca' : '#f5f5f5', backdropFilter: 'blur(10px)', border: t.type === 'error' ? '1px solid #f87171' : '1px solid #d4d4d4', color: t.type === 'error' ? '#450a0a' : '#111111', padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: 800, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            {t.type === 'error' ? <AlertCircle size={16} color="#450a0a" /> : <Zap size={16} color="#111111" />}
            <span style={{ color: t.type === 'error' ? '#450a0a' : '#111111' }}>{t.message}</span>
          </div>
        ))}
      </div>

      <aside className="sidebar" ref={sidebarRef} style={{ width: '124px', minWidth: '124px', background: '#040404', borderRight: '1px solid #181818', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '24px 0', zIndex: 10, position: 'relative' }}>
        <div
          className="nav-indicator"
          style={navIndicator
            ? { width: navIndicator.w, height: navIndicator.h, transform: `translate(${navIndicator.x}px, ${navIndicator.y}px)`, opacity: 1, zIndex: 1, position: 'absolute', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05))', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '14px', boxShadow: '0 0 15px rgba(255, 255, 255, 0.08)' }
            : { opacity: 0 }}
        />
        <div className="sidebar-top" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div className="logo-container" onClick={() => handleTabChange('play')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', marginBottom: '16px' }}>
            <img src={logoImg} alt="StarClient" style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.25))' }} />
          </div>

          <div ref={(el) => { navRefs.current['play'] = el; }} className={`nav-item ${activeTab === 'play' ? 'active' : ''}`} onClick={() => handleTabChange('play')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '12px 8px', minHeight: '74px', borderRadius: '14px', width: '104px', position: 'relative', zIndex: 2 }}>
            <Gamepad2 size={26} color={activeTab === 'play' ? '#f5f5f5' : '#858585'} style={{ marginBottom: '6px', transition: 'color 0.2s' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: activeTab === 'play' ? '#ffffff' : '#858585', letterSpacing: '0.5px' }}>PLAY</span>
          </div>

          <div ref={(el) => { navRefs.current['profile'] = el; }} className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '12px 8px', minHeight: '74px', borderRadius: '14px', width: '104px', position: 'relative', zIndex: 2 }}>
            <Package size={26} color={activeTab === 'profile' ? '#f5f5f5' : '#858585'} style={{ marginBottom: '6px', transition: 'color 0.2s' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: activeTab === 'profile' ? '#ffffff' : '#858585', letterSpacing: '0.5px' }}>PROFILES</span>
          </div>

          <div ref={(el) => { navRefs.current['mods'] = el; }} className={`nav-item ${activeTab === 'mods' ? 'active' : ''}`} onClick={() => handleTabChange('mods')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '12px 8px', minHeight: '74px', borderRadius: '14px', width: '104px', position: 'relative', zIndex: 2 }}>
            <Compass size={26} color={activeTab === 'mods' ? '#f5f5f5' : '#858585'} style={{ marginBottom: '6px', transition: 'color 0.2s' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: activeTab === 'mods' ? '#ffffff' : '#858585', letterSpacing: '0.5px' }}>BROWSE</span>
          </div>

          <div ref={(el) => { navRefs.current['accounts'] = el; }} className={`nav-item ${activeTab === 'accounts' ? 'active' : ''}`} onClick={() => handleTabChange('accounts')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '12px 8px', minHeight: '74px', borderRadius: '14px', width: '104px', position: 'relative', zIndex: 2 }}>
            <Users size={26} color={activeTab === 'accounts' ? '#f5f5f5' : '#858585'} style={{ marginBottom: '6px', transition: 'color 0.2s' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: activeTab === 'accounts' ? '#ffffff' : '#858585', letterSpacing: '0.5px' }}>ACCOUNTS</span>
          </div>
        </div>

        <div className="sidebar-bottom">
          <div ref={(el) => { navRefs.current['settings'] = el; }} className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => handleTabChange('settings')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '12px 8px', minHeight: '74px', borderRadius: '14px', width: '104px', position: 'relative', zIndex: 2 }}>
            <Settings size={26} color={activeTab === 'settings' ? '#f5f5f5' : '#858585'} style={{ marginBottom: '6px', transition: 'color 0.2s' }} />
            <span style={{ fontSize: '11px', fontWeight: 900, color: activeTab === 'settings' ? '#ffffff' : '#858585', letterSpacing: '0.5px' }}>SETTINGS</span>
          </div>
        </div>
      </aside>

      <main className="main-content" style={{ flex: 1, padding: '32px', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#060606' }}>
        
        {/* TOP BAR */}
        <header className="top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', WebkitAppRegion: 'drag' } as any}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', WebkitAppRegion: 'no-drag' } as any}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f5f5f5', boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)' }} />
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#f8fafc', letterSpacing: '1.5px' }}>STARCLIENT</span>
            </div>
            {updateAvailable && (
              <a href={updateAvailable.url} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', color: '#060606', padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 900, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)' }}>
                <Download size={14} /> Update v{updateAvailable.version} Available!
              </a>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', WebkitAppRegion: 'no-drag' } as any}>
            <div ref={profilePopoverRef} style={{ position: 'relative' }}>
              <div className="profile-card" onClick={() => setIsProfilePopoverOpen(!isProfilePopoverOpen)} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#111111', border: '1px solid #292929', padding: '8px 18px', borderRadius: '24px', cursor: 'pointer', transition: 'border-color 0.2s' }}>
                <img 
                  src={avatarHeadUrl} 
                  alt="Avatar" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/${username}/32`;
                  }}
                  style={{ borderRadius: '6px', width: '30px', height: '30px', objectFit: 'cover' }} 
                />
                <div className="profile-meta" style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#fff' }}>{username}</span>
                  <span style={{ fontSize: '9px', color: '#f5f5f5', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.5px' }}>{accountType}</span>
                </div>
                <ChevronDown size={16} color="#858585" />
              </div>

              {isProfilePopoverOpen && (
                <div className="fade-in" style={{ position: 'absolute', top: '54px', right: '0px', width: '270px', background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '14px', padding: '16px', zIndex: 100, boxShadow: '0 16px 40px rgba(0,0,0,0.9)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '11px', color: '#858585', fontWeight: 900, letterSpacing: '1px' }}>SIGNED-IN ACCOUNTS</span>
                    <X size={16} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setIsProfilePopoverOpen(false)} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px', maxHeight: '160px', overflowY: 'auto' }}>
                    {accounts.map((acc) => (
                      <div 
                        key={acc.username}
                        onClick={() => handleSwitchAccount(acc)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: username === acc.username ? '#292929' : '#0b0b0b', borderRadius: '10px', cursor: 'pointer', border: username === acc.username ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid transparent' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{acc.username}</span>
                        </div>
                        <span style={{ fontSize: '9px', fontWeight: 900, color: '#f5f5f5', textTransform: 'uppercase' }}>{acc.type}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#0b0b0b', borderRadius: '10px', cursor: 'pointer', border: '1px dashed rgba(255, 255, 255, 0.4)' }} onClick={() => { setIsProfilePopoverOpen(false); setAddAccountStep('selector'); setIsAddAccountModalOpen(true); }}>
                    <Plus size={16} color="#f5f5f5" />
                    <span style={{ fontSize: '12px', fontWeight: 900, color: '#f5f5f5' }}>Add New Account</span>
                  </div>
                </div>
              )}
            </div>

            {/* WINDOW CONTROLS */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginLeft: '8px' }}>
              <button 
                onClick={() => window.electronAPI?.minimizeWindow?.()}
                style={{ background: 'transparent', border: 'none', color: '#a1a1a1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.15s' }}
                title="Minimize"
              >
                <Minus size={20} />
              </button>
              <button 
                onClick={() => window.electronAPI?.closeWindow?.()}
                style={{ background: 'transparent', border: 'none', color: '#a1a1a1', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', transition: 'color 0.15s' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </header>

        {activeTab === 'play' && (
          <div className="tab-page-wrapper fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <section className="hero-banner" style={{ position: 'relative', backgroundImage: `url("${img1}")`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '24px', height: '460px', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.15)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
              {show3dSkinView && (
                <HomeSkinPreview username={username} />
              )}
              
              <div style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {!isLaunching ? (
                  <button 
                    onClick={() => handleLaunchGame()} 
                    style={{ 
                      background: '#111111', 
                      border: '2px solid #f5f5f5', 
                      borderRadius: '14px', 
                      padding: '14px 70px', 
                      color: '#ffffff', 
                      fontSize: '20px', 
                      fontWeight: '900', 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '10px',
                      boxShadow: '0 0 16px rgba(255, 255, 255, 0.12)',
                      letterSpacing: '2px',
                      transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    <Play size={20} fill="#ffffff" color="#ffffff" /> PLAY
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button 
                      disabled
                      style={{ 
                        background: '#111111', 
                        border: '2px solid #f5f5f5', 
                        borderRadius: '14px', 
                        padding: '14px 40px', 
                        color: '#ffffff', 
                        fontSize: '18px', 
                        fontWeight: '900', 
                        cursor: 'not-allowed',
                        letterSpacing: '2px'
                      }}
                    >
                      RUNNING...
                    </button>
                    <button 
                      onClick={handleStopGame}
                      title="Stop Game"
                      style={{ 
                        background: '#dc2626', 
                        border: '2px solid #060606', 
                        borderRadius: '14px', 
                        width: '54px', 
                        height: '54px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                        transition: 'transform 0.15s'
                      }}
                    >
                      <X size={24} color="#ffffff" strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="home-panels">
              <div className="home-panel">
                <div className="home-panel-heading">
                  <div className="home-panel-icon"><History size={17} /></div>
                  <div>
                    <h2>Changelog</h2>
                    <p>Recent StarClient updates</p>
                  </div>
                </div>
                <ul className="changelog-list">
                  <li><span>01</span><p>Offline account login is the current launcher mode.</p></li>
                  <li><span>02</span><p>Microsoft login is reserved as a Coming Soon option.</p></li>
                  <li><span>03</span><p>Added a fixed-size, movable launcher window.</p></li>
                  <li><span>04</span><p>Minecraft can be stopped from the launcher console.</p></li>
                  <li><span>05</span><p>Installed content supports selecting cards and bulk deletion.</p></li>
                </ul>
              </div>
              <div className="home-panel">
                <div className="home-panel-heading">
                  <div className="home-panel-icon"><Server size={17} /></div>
                  <div>
                    <h2>Your Servers</h2>
                    <p>Your 3 most recently added servers</p>
                  </div>
                </div>
                {homeServers.length === 0 ? (
                  <div className="home-server-empty">
                    <p>No saved servers yet.</p>
                    <button onClick={() => { handleTabChange('settings'); setSettingsSubTab('servers'); }}>Add a server</button>
                  </div>
                ) : (
                  <div className="home-server-list">
                    {homeServers.map((server) => {
                      const profile = installedProfiles.find((item) => item.id === server.profileId);
                      return (
                        <div className="home-server-row" key={server.id}>
                          <div className="home-server-identity">
                            <div className="home-server-icon">
                              {serverIcons[server.id]
                                ? <img src={serverIcons[server.id]} alt="" />
                                : <Server size={19} />}
                            </div>
                            <div className="home-server-copy">
                              <strong>{server.name}</strong>
                              <span>{server.address}</span>
                            </div>
                          </div>
                          <button
                            className="home-server-play"
                            disabled={!profile || isLaunching}
                            title={profile ? `Quick Play ${server.name}` : 'The saved profile for this server is unavailable'}
                            onClick={() => profile && handleLaunchGame(server)}
                          >
                            <Play size={14} fill="currentColor" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {savedServers.length > 3 && (
                  <button className="home-server-manage" onClick={() => { handleTabChange('settings'); setSettingsSubTab('servers'); }}>
                    Manage servers <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </section>
          </div>
        )}

        {/* PROFILES TAB */}
        {activeTab === 'profile' && (
          <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#ffffff', margin: 0 }}>Your Profiles</h1>
              <button 
                onClick={handleImportBackup} 
                style={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#f5f5f5', padding: '10px 18px', borderRadius: '12px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.1)' }}
              >
                <Archive size={16} /> Import Backup (.zip)
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={18} color="#858585" style={{ position: 'absolute', left: '16px' }} />
                <input 
                  type="text" 
                  placeholder="Search profiles..." 
                  value={profileSearchQuery}
                  onChange={(e) => setProfileSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '14px 16px 14px 48px', background: '#111111', border: '1px solid #292929', borderRadius: '14px', color: '#fff', fontSize: '14px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', alignItems: 'stretch' }}>
              {filteredProfiles.map((inst) => {
                const isActive = activeProfileId === inst.id;
                const isMenuOpen = openMenuId === inst.id;

                return (
                  <div 
                    key={inst.id}
                    onClick={() => {
                      setActiveProfileId(inst.id);
                      setMcVersion(inst.version);
                      setSelectedInstanceDetail(inst);
                    }}
                    style={{ 
                      background: '#111111', 
                      border: isActive ? '2px solid #f5f5f5' : '1px solid #292929', 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      display: 'flex', 
                      flexDirection: 'column',
                      position: 'relative',
                      cursor: 'pointer',
                      height: '280px',
                      boxShadow: isActive ? '0 0 20px rgba(255, 255, 255, 0.15)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ height: '80px', backgroundImage: `url(${grassBannerImg})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ background: '#060606', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#f5f5f5', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                        {inst.loader}
                      </span>
                      {isActive && (
                        <div style={{ width: '28px', height: '28px', background: '#f5f5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                          <Check size={16} color="#060606" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px' }}>
                          <div style={{ width: '42px', height: '42px', background: '#0b0b0b', border: '1px solid #292929', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src="https://cdn.modrinth.com/data/P7dR8mSH/icon.png" alt="Logo" style={{ width: '26px', height: '26px', objectFit: 'contain' }} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#fff', margin: 0 }}>{inst.title}</h3>
                            <p style={{ fontSize: '12px', color: '#858585', margin: '2px 0 0 0' }}>{inst.subtitle}</p>
                          </div>
                        </div>

                        <p style={{ fontSize: '13px', color: '#858585', lineHeight: 1.4, margin: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{inst.description}</p>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', position: 'relative', alignItems: 'center' }}>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveProfileId(inst.id); 
                            setMcVersion(inst.version); 
                            handleTabChange('play'); 
                          }}
                          style={{ flex: 1, height: '42px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Play size={14} fill="#fff" /> Play
                        </button>
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveProfileId(inst.id);
                            setMcVersion(inst.version);
                            setModsCategory('mods'); 
                            setModsViewMode('installed');
                            handleTabChange('mods'); 
                          }}
                          style={{ flex: 1, height: '42px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', color: '#fff', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        >
                          <Puzzle size={14} /> Mods
                        </button>

                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleExportBackup(inst); 
                          }}
                          style={{ width: '42px', height: '42px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', color: '#f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Export Backup"
                        >
                          <Archive size={18} />
                        </button>

                        <div className="profile-menu-container" style={{ position: 'relative', width: '42px', height: '42px', flexShrink: 0 }}>
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setOpenMenuId(isMenuOpen ? null : inst.id);
                            }}
                            style={{ width: '42px', height: '42px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '10px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {isMenuOpen && (
                            <div style={{ position: 'absolute', bottom: '50px', right: '0', width: '180px', background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '12px', padding: '6px', zIndex: 100, boxShadow: '0 10px 30px rgba(0,0,0,0.9)' }}>
                              <div onClick={(e) => { e.stopPropagation(); setEditingInstance(inst); setOpenMenuId(null); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, background: '#1a1a1a', marginBottom: '4px' }}>
                                <Edit3 size={16} color="#f5f5f5" /> Edit Profile
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void handleRepairProfile(inst); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, background: '#1a1a1a', marginBottom: '4px' }}>
                                <Wrench size={16} color="#f5f5f5" /> Repair Profile
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); void handleLoadCrashReports(inst); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, background: '#1a1a1a', marginBottom: '4px' }}>
                                <FileWarning size={16} color="#fca5a5" /> Crash Reports
                              </div>
                              <div onClick={(e) => { e.stopPropagation(); handleDeleteInstance(inst.id); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 800, background: '#1a1a1a' }}>
                                <Trash2 size={16} color="#ef4444" /> Delete Profile
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div 
                onClick={() => handleTabChange('instances')}
                style={{ 
                  background: '#111111', 
                  border: '1px dashed #292929', 
                  borderRadius: '16px', 
                  height: '280px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer',
                  gap: '12px',
                  transition: 'border-color 0.2s'
                }}
              >
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.4)' }}>
                  <Plus size={24} color="#f5f5f5" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#858585', letterSpacing: '1px' }}>EXPLORE INSTANCES</span>
              </div>
            </div>
          </div>
        )}

        {/* INSTANCES CATALOG TAB */}
        {activeTab === 'instances' && (
          <div className="page-container fade-in">
            <h1 className="page-title" style={{ fontSize: '24px', fontWeight: 900, marginBottom: '24px' }}>Game Instances Catalog</h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', paddingBottom: '40px', alignItems: 'stretch' }}>
              {catalogGroups.map((group) => {
                const hasBanner = group.image && group.image !== '';

                return (
                  <div 
                    key={group.id} 
                    style={{ 
                      background: '#111111', 
                      border: '1px solid #292929', 
                      borderRadius: '16px', 
                      overflow: 'hidden',
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      boxSizing: 'border-box',
                      minHeight: hasBanner ? '360px' : '220px'
                    }}
                  >
                    {hasBanner && (
                      <div style={{ height: '140px', backgroundImage: `url(${group.image})`, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '12px', left: '12px', background: '#060606', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#f5f5f5', fontSize: '10px', fontWeight: 900, padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>
                          {group.loader}
                        </div>
                      </div>
                    )}

                    <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        {!hasBanner && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ color: '#f5f5f5', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Legacy / Older Build</span>
                            <span style={{ background: '#1a1a1a', color: '#858585', fontSize: '10px', fontWeight: 900, padding: '3px 8px', borderRadius: '6px' }}>{group.loader}</span>
                          </div>
                        )}

                        <h3 style={{ fontSize: '17px', fontWeight: 900, marginBottom: '2px', color: '#fff' }}>{group.title}</h3>
                        <p style={{ fontSize: '12px', color: '#f5f5f5', fontWeight: 800, marginBottom: '8px' }}>{group.subtitle}</p>
                        <p style={{ fontSize: '13px', color: '#858585', marginBottom: '16px', lineHeight: 1.4 }}>{group.description}</p>
                      </div>

                      <div>
                        <button 
                          onClick={() => {
                            setActiveCatalogGroup(group);
                            setWizardSelectedVersion(group.versions[0].value);
                            setWizardSelectedLoader(group.loader);
                            setWizardStep(1);
                          }}
                          style={{ width: '100%', background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', padding: '11px', borderRadius: '10px', color: '#060606', fontWeight: 900, cursor: 'pointer', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)', fontSize: '13px' }}
                        >
                          Select Version
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODS TAB WITH POP-UP MODAL SELECTOR */}
        {activeTab === 'mods' && (
          <div className="page-container fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: modsViewMode === 'installed' ? '4px' : '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => handleModsCategoryChange('mods')}
                  style={{ padding: '8px 16px', borderRadius: '10px', background: modsCategory === 'mods' ? '#f5f5f5' : '#111111', color: modsCategory === 'mods' ? '#060606' : '#fff', fontWeight: 900, border: '1px solid #292929', cursor: 'pointer', fontSize: '13px' }}
                >
                  Mods
                </button>
                <button 
                  onClick={() => handleModsCategoryChange('modpacks')}
                  style={{ padding: '8px 16px', borderRadius: '10px', background: modsCategory === 'modpacks' ? '#f5f5f5' : '#111111', color: modsCategory === 'modpacks' ? '#060606' : '#fff', fontWeight: 900, border: '1px solid #292929', cursor: 'pointer', fontSize: '13px' }}
                >
                  Modpacks
                </button>
                <button 
                  onClick={() => handleModsCategoryChange('resourcepacks')}
                  style={{ padding: '8px 16px', borderRadius: '10px', background: modsCategory === 'resourcepacks' ? '#f5f5f5' : '#111111', color: modsCategory === 'resourcepacks' ? '#060606' : '#fff', fontWeight: 900, border: '1px solid #292929', cursor: 'pointer', fontSize: '13px' }}
                >
                  Resource Packs
                </button>
                <button 
                  onClick={() => handleModsCategoryChange('datapacks')}
                  style={{ padding: '8px 16px', borderRadius: '10px', background: modsCategory === 'datapacks' ? '#f5f5f5' : '#111111', color: modsCategory === 'datapacks' ? '#060606' : '#fff', fontWeight: 900, border: '1px solid #292929', cursor: 'pointer', fontSize: '13px' }}
                >
                  Data Packs
                </button>
                <button 
                  onClick={() => handleModsCategoryChange('shaders')}
                  style={{ padding: '8px 16px', borderRadius: '10px', background: modsCategory === 'shaders' ? '#f5f5f5' : '#111111', color: modsCategory === 'shaders' ? '#060606' : '#fff', fontWeight: 900, border: '1px solid #292929', cursor: 'pointer', fontSize: '13px' }}
                >
                  Shaderpacks
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', background: '#111111', border: '1px solid #292929', borderRadius: '12px', padding: '4px' }}>
                  <button 
                    onClick={() => {
                      setModsViewMode('browse');
                      setIsSelectingInstalledItems(false);
                      setSelectedInstalledItemKeys([]);
                    }}
                    style={{ background: modsViewMode === 'browse' ? '#f5f5f5' : 'transparent', color: modsViewMode === 'browse' ? '#060606' : '#fff', padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Browse
                  </button>
                  <button 
                    onClick={() => {
                      setModsViewMode('installed');
                      setIsSelectingInstalledItems(false);
                      setSelectedInstalledItemKeys([]);
                    }}
                    style={{ background: modsViewMode === 'installed' ? '#f5f5f5' : 'transparent', color: modsViewMode === 'installed' ? '#060606' : '#fff', padding: '6px 14px', borderRadius: '8px', border: 'none', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
                  >
                    Installed ({installedMods.length})
                  </button>
                </div>
              </div>
            </div>

            {modsViewMode === 'installed' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => void handleUploadCustomFile()}
                  style={{ background: '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#f5f5f5', padding: '10px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}
                >
                  <Upload size={15} /> Upload
                </button>
                <button
                  onClick={() => {
                    setIsSelectingInstalledItems((current) => !current);
                    setSelectedInstalledItemKeys([]);
                  }}
                  style={{ background: isSelectingInstalledItems ? '#f5f5f5' : '#1a1a1a', border: '1px solid rgba(255, 255, 255, 0.4)', color: isSelectingInstalledItems ? '#111111' : '#f5f5f5', padding: '10px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}
                >
                  {isSelectingInstalledItems ? 'Cancel' : 'Select'}
                </button>
                {isSelectingInstalledItems && selectedInstalledItemKeys.length > 0 && (
                  <button
                    onClick={() => void handleRemoveSelectedContent()}
                    style={{ background: '#dc2626', border: '1px solid #b91c1c', color: '#fff', padding: '10px 14px', borderRadius: '10px', fontWeight: 900, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px' }}
                  >
                    <Trash2 size={15} /> Delete ({selectedInstalledItemKeys.length})
                  </button>
                )}
              </div>
            )}

            {modsViewMode === 'browse' ? (
              <div
                className={`browse-drop-zone${isBrowseFileDragActive ? ' is-dragging' : ''}`}
                onDragEnter={(event) => {
                  if (!Array.from(event.dataTransfer.types).includes('Files')) return;
                  event.preventDefault();
                  browseFileDragDepth.current += 1;
                  setIsBrowseFileDragActive(true);
                  setDraggedBrowseFileNames(Array.from(event.dataTransfer.items)
                    .filter((item) => item.kind === 'file')
                    .map((item) => item.getAsFile()?.name || '')
                    .filter(Boolean));
                }}
                onDragOver={(event) => {
                  if (Array.from(event.dataTransfer.types).includes('Files')) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'copy';
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  browseFileDragDepth.current = Math.max(0, browseFileDragDepth.current - 1);
                  if (browseFileDragDepth.current === 0) {
                    setIsBrowseFileDragActive(false);
                    setDraggedBrowseFileNames([]);
                  }
                }}
                onDrop={handleBrowseFileDrop}
              >
                <div className="browse-drop-hint">
                  <FileArchive size={16} />
                  <span>Drag files here to install into the selected profile</span>
                  <span className="browse-drop-hint-type">
                    {modsCategory === 'mods' ? '.jar' : modsCategory === 'modpacks' ? '.mrpack / .zip' : '.zip'}
                  </span>
                </div>
                <div className="browse-search-row">
                  <form onSubmit={(e) => { e.preventDefault(); setModPage(0); fetchModrinthContent(modQuery, 0, modsCategory); }} className="browse-search-form">
                    <input type="text" placeholder={`Search ${modsCategory}...`} value={modQuery} onChange={(e) => { setModQuery(e.target.value); setModPage(0); }} style={{ width: '100%', padding: '14px 18px', background: '#111111', border: '1px solid #292929', color: '#fff', borderRadius: '12px', fontSize: '14px', outline: 'none' }} />
                  </form>
                  {renderBrowsePagination('top')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '18px' }}>
                  {loadingMods ? (
                    <p style={{ color: '#858585' }}>Searching Modrinth registry...</p>
                  ) : (
                    modsList.map((item) => {
                      const isAdded = installedMods.some((m) =>
                        m.project_id === item.project_id &&
                        (m.profileId ? m.profileId === activeProfileId : m.instanceVersion === activeProfile?.version)
                      );
                      const progress = downloadingModIds[item.project_id];
                      const isDownloading = progress !== undefined;

                      return (
                        <div key={item.project_id} className="mod-card-large" style={{ background: '#111111', border: '1px solid #292929', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                              {item.icon_url ? (
                                <img src={item.icon_url} alt={item.title} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Puzzle size={20} color="#858585" />
                                </div>
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                                <span style={{ fontSize: '12px', color: '#858585' }}>by {item.author || 'Modrinth User'}</span>
                              </div>
                            </div>
                            <p style={{ fontSize: '13px', color: '#858585', lineHeight: 1.4, marginBottom: '12px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>
                          </div>

                          <div>
                            {isDownloading ? (
                              <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                                <span style={{ fontSize: '12px', color: '#f5f5f5', fontWeight: 800 }}>Installing; waiting for download to finish…</span>
                              </div>
                            ) : (
                              <button 
                                className="action-btn" 
                                disabled={isAdded || isAnyModDownloading} 
                                onClick={() => {
                                  setSelectedModForDownload(item);
                                  setModalModVersion(activeProfile?.version || mcVersion);
                                  setModalModLoader(activeProfile?.loader || 'Fabric');
                                }} 
                                style={{ 
                                  width: '100%', 
                                  color: isAdded ? '#f5f5f5' : '#060606', 
                                  fontWeight: 900, 
                                  background: isAdded ? '#1a1a1a' : (isAnyModDownloading ? '#3f3f3f' : 'linear-gradient(135deg, #f5f5f5, #bdbdbd)'), 
                                  border: isAdded ? '1px solid #292929' : 'none', 
                                  padding: '11px', 
                                  borderRadius: '10px', 
                                  cursor: (isAdded || isAnyModDownloading) ? 'default' : 'pointer', 
                                  fontSize: '13px', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  gap: '8px' 
                                }}
                              >
                                <Download size={15} />
                                {isAdded ? 'Installed' : 'Download'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {renderBrowsePagination('bottom')}
                {isBrowseFileDragActive && (
                  <div className="browse-drop-overlay" aria-live="polite">
                    <div className="browse-drop-prompt">
                      <span className="browse-drop-icon">
                        {modsCategory === 'resourcepacks' ? <ImageIcon size={28} /> :
                          modsCategory === 'shaders' ? <ImageIcon size={28} /> :
                            modsCategory === 'modpacks' ? <Package size={28} /> :
                              modsCategory === 'datapacks' ? <FileArchive size={28} /> :
                                modsCategory === 'worlds' ? <Gamepad2 size={28} /> : <Puzzle size={28} />}
                      </span>
                      <strong>{isImportingDroppedFiles ? 'Installing your files…' : `Drop ${modsCategory === 'mods' ? 'Fabric mod JARs' : modsCategory === 'resourcepacks' ? 'resource-pack ZIPs' : modsCategory === 'shaders' ? 'shader-pack ZIPs' : modsCategory === 'datapacks' ? 'data-pack ZIPs' : modsCategory === 'worlds' ? 'world ZIPs' : 'Modrinth modpacks'}`} here</strong>
                      <span>Files will be added to {activeProfile?.title || 'your selected profile'}.</span>
                      {draggedBrowseFileNames.length > 0 && (
                        <div className="browse-drop-file-list">
                          {draggedBrowseFileNames.slice(0, 3).map((name, index) => <span key={`${name}-${index}`}>{name}</span>)}
                          {draggedBrowseFileNames.length > 3 && <span>and {draggedBrowseFileNames.length - 3} more</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '18px' }}>
                {activeProfileMods.length === 0 ? (
                  <div style={{ color: '#858585', fontSize: '14px', padding: '20px 0' }}>No installed items yet. Download mods or modpacks from the Browse tab!</div>
                ) : (
                  activeProfileMods.map((item) => {
                    const isEnabled = item.enabled !== false;
                    const canToggle = Boolean(item.path) && item.category !== 'modpack' && item.category !== 'worlds';
                    const isSelectable = Boolean(item.path) && item.category !== 'modpack';
                    const itemKey = getInstalledItemKey(item);
                    const isSelected = selectedInstalledItemKeys.includes(itemKey);

                    return (
                      <div
                        key={`${item.project_id}-${item.path || item.profileId || ''}`}
                        onClick={() => {
                          if (!isSelectingInstalledItems || !isSelectable) return;
                          setSelectedInstalledItemKeys((current) => isSelected
                            ? current.filter((key) => key !== itemKey)
                            : [...current, itemKey]);
                        }}
                        onKeyDown={(event) => {
                          if (!isSelectingInstalledItems || !isSelectable || (event.key !== 'Enter' && event.key !== ' ')) return;
                          event.preventDefault();
                          setSelectedInstalledItemKeys((current) => isSelected
                            ? current.filter((key) => key !== itemKey)
                            : [...current, itemKey]);
                        }}
                        role={isSelectingInstalledItems && isSelectable ? 'checkbox' : undefined}
                        aria-checked={isSelectingInstalledItems && isSelectable ? isSelected : undefined}
                        tabIndex={isSelectingInstalledItems && isSelectable ? 0 : undefined}
                        style={{ background: '#111111', border: isSelected ? '2px solid #f5f5f5' : '1px solid #292929', boxShadow: isSelected ? '0 0 16px rgba(255, 255, 255, 0.2)' : 'none', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', opacity: isEnabled ? 1 : 0.6, minHeight: '180px', cursor: isSelectingInstalledItems && isSelectable ? 'pointer' : 'default', transition: 'border-color .15s, box-shadow .15s' }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                            {item.icon_url ? (
                              <img src={item.icon_url} alt={item.title} style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Puzzle size={20} color="#f5f5f5" />
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</h3>
                              <span style={{ fontSize: '12px', color: '#858585' }}>Version: {item.versionStr || mcVersion}</span>
                            </div>
                          </div>
                          <p style={{ fontSize: '13px', color: '#858585', lineHeight: 1.4, marginBottom: '14px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.description}</p>
                        </div>

                        <div 
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canToggle) handleToggleModEnabled(item);
                          }}
                          style={{ 
                            background: isEnabled ? 'rgba(255, 255, 255, 0.1)' : '#1a1a1a', 
                            border: isEnabled ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid #292929', 
                            color: isEnabled ? '#f5f5f5' : '#858585', 
                            padding: '10px 14px', 
                            borderRadius: '10px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            cursor: canToggle ? 'pointer' : 'default',
                            fontWeight: 900,
                            fontSize: '13px',
                            opacity: canToggle ? 1 : 0.7
                          }}
                        >
                          <span>{item.category === 'modpack' ? 'Managed by profile' : isEnabled ? 'Enabled' : 'Disabled'}</span>
                          <div style={{ width: '38px', height: '22px', borderRadius: '11px', background: isEnabled ? '#f5f5f5' : '#3f3f3f', padding: '2px', display: 'flex', alignItems: 'center', transition: 'background 0.2s ease' }}>
                            <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ffffff', transform: isEnabled ? 'translateX(16px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }} />
                          </div>
                        </div>
                        {item.category === 'modpack' && item.profileId ? (
                          <button
                            onClick={() => {
                              const profile = installedProfiles.find((instance) => instance.id === item.profileId);
                              if (!profile) return;
                              setActiveProfileId(profile.id);
                              setMcVersion(profile.version);
                              setActiveTab('play');
                            }}
                            style={{ marginTop: '8px', width: '100%', padding: '8px', borderRadius: '9px', border: '1px solid #292929', background: '#1a1a1a', color: '#f5f5f5', cursor: 'pointer', fontWeight: 800, fontSize: '12px' }}
                          >
                            Open profile
                          </button>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* ACCOUNTS TAB */}
        {activeTab === 'accounts' && (
          <div className="page-container fade-in">
            <div className="account-page-header">
              <div>
                <h1 className="page-title">Accounts</h1>
                <p>Manage your offline launcher profiles.</p>
              </div>
            </div>
            <div className="account-cards-grid">
              {accounts.map((acc) => {
                const isSelectedAccount = username === acc.username;

                return (
                  <article key={acc.username} className={isSelectedAccount ? 'account-card selected' : 'account-card'}>
                    <div className="account-card-topline">
                      <div className="account-identity">
                        <div className="account-avatar-wrap">
                          <img src={`https://minotar.net/helm/${acc.username}/64.png`} alt="" onError={(e) => { (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/${acc.username}/64`; }} />
                        </div>
                        <div className="account-identity-copy">
                          <h3>{acc.username}</h3>
                          <span>{acc.type} account</span>
                        </div>
                      </div>
                      {isSelectedAccount && <span className="account-selected-badge"><Check size={13} /> Active</span>}
                    </div>
                    <div className="account-card-divider" />
                    <div className="account-card-actions">
                      {username !== acc.username && (
                        <button className="account-action-button primary" onClick={() => handleSwitchAccount(acc)}>
                          <Check size={14} />
                          Select
                        </button>
                      )}
                      <button className="account-action-button danger" onClick={() => setAccountToDelete(acc)}>
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  </article>
                );
              })}

              <button className="account-add-card" onClick={() => { setAddAccountStep('selector'); setIsAddAccountModalOpen(true); }}>
                <span className="account-add-icon"><Plus size={20} /></span>
                <span className="account-add-title">Add an account</span>
                <span className="account-add-caption">Connect another player profile</span>
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS TAB WITH CONSOLE HEADER LAUNCH/STOP BUTTONS */}
        {activeTab === 'settings' && (
          <div className="page-container fade-in" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSettingsSubTab('game')} style={{ color: settingsSubTab === 'game' ? '#060606' : '#fff', fontWeight: 900, padding: '10px 18px', borderRadius: '12px', border: '1px solid #292929', background: settingsSubTab === 'game' ? '#f5f5f5' : '#111111', cursor: 'pointer' }}>
                  Game Options
                </button>
                <button onClick={() => setSettingsSubTab('java')} style={{ color: settingsSubTab === 'java' ? '#060606' : '#fff', fontWeight: 900, padding: '10px 18px', borderRadius: '12px', border: '1px solid #292929', background: settingsSubTab === 'java' ? '#f5f5f5' : '#111111', cursor: 'pointer' }}>
                  Java & Paths
                </button>
                <button onClick={() => setSettingsSubTab('servers')} style={{ color: settingsSubTab === 'servers' ? '#060606' : '#fff', fontWeight: 900, padding: '10px 18px', borderRadius: '12px', border: '1px solid #292929', background: settingsSubTab === 'servers' ? '#f5f5f5' : '#111111', cursor: 'pointer' }}>
                  Servers
                </button>
                <button onClick={() => setSettingsSubTab('console')} style={{ color: settingsSubTab === 'console' ? '#060606' : '#fff', fontWeight: 900, padding: '10px 18px', borderRadius: '12px', border: '1px solid #292929', background: settingsSubTab === 'console' ? '#f5f5f5' : '#111111', cursor: 'pointer' }}>
                  Console Log
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f5f5f5', fontSize: '13px', fontWeight: 900 }}>
                <Check size={16} /> Auto-Saved
              </div>
            </div>

            {settingsSubTab === 'game' && (
              <div className="panel-card fade-in" style={{ background: '#111111', border: '1px solid #292929', padding: '24px', borderRadius: '16px' }}>
                <h2 className="panel-title" style={{ fontSize: '17px', fontWeight: 900, color: '#f8fafc', marginBottom: '20px' }}>GAME PERFORMANCE & OPTIONS</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Minecraft Version Profile</label>
                    <CustomDropdown options={versionOptions} value={mcVersion} onChange={setMcVersion} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', color: '#858585', fontWeight: 800 }}>Memory Allocation (RAM)</label>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#f5f5f5' }}>{ramAllocation} GB</span>
                    </div>
                    <input type="range" min="2" max="16" value={ramAllocation} onChange={(e) => setRamAllocation(Number(e.target.value))} style={{ width: '100%', accentColor: '#f5f5f5' }} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '13px', color: '#858585', fontWeight: 800 }}>Max Frame Rate Limit (FPS Cap)</label>
                      <span style={{ fontSize: '13px', fontWeight: 900, color: '#f5f5f5' }}>{maxFps} FPS</span>
                    </div>
                    <input type="range" min="30" max="260" step="10" value={maxFps} onChange={(e) => setMaxFps(Number(e.target.value))} style={{ width: '100%', accentColor: '#f5f5f5' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Game Window Resolution</label>
                    <CustomDropdown options={resolutionOptions} value={resolution} onChange={setResolution} />
                  </div>

                  <div style={{ borderTop: '1px solid #292929', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: '#fff' }}>Start Minecraft Fullscreen</h4>
                      <p style={{ fontSize: '13px', color: '#858585', margin: '4px 0 0 0' }}>Launch game in direct full-screen mode.</p>
                    </div>

                    <div onClick={() => setEnableFullscreen(!enableFullscreen)} style={{ width: '52px', height: '28px', borderRadius: '14px', background: enableFullscreen ? '#f5f5f5' : '#1a1a1a', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', border: '1px solid #3f3f3f', transition: 'background 0.2s' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', transform: enableFullscreen ? 'translateX(24px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #292929', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: '#fff' }}>Auto-Close Launcher</h4>
                      <p style={{ fontSize: '13px', color: '#858585', margin: '4px 0 0 0' }}>Close StarClient automatically when Minecraft opens.</p>
                    </div>

                    <div onClick={() => setCloseLauncherOnLaunch(!closeLauncherOnLaunch)} style={{ width: '52px', height: '28px', borderRadius: '14px', background: closeLauncherOnLaunch ? '#f5f5f5' : '#1a1a1a', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', border: '1px solid #3f3f3f', transition: 'background 0.2s' }}>
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ffffff', transform: closeLauncherOnLaunch ? 'translateX(24px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }} />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid #292929', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, margin: 0, color: '#fff' }}>Show 3D Skin View</h4>
                      <p style={{ fontSize: '13px', color: '#858585', margin: '4px 0 0 0' }}>Display your player's skin and face on the Home screen.</p>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={show3dSkinView}
                      aria-label="Show 3D Skin View"
                      onClick={() => setShow3dSkinView((visible) => !visible)}
                      style={{ width: '52px', height: '28px', borderRadius: '14px', background: show3dSkinView ? '#f5f5f5' : '#1a1a1a', padding: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', border: '1px solid #3f3f3f', transition: 'background 0.2s' }}
                    >
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: show3dSkinView ? '#111111' : '#ffffff', transform: show3dSkinView ? 'translateX(24px)' : 'translateX(0px)', transition: 'transform 0.2s ease' }} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'java' && (
              <div className="panel-card fade-in" style={{ background: '#111111', border: '1px solid #292929', padding: '24px', borderRadius: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 className="panel-title" style={{ fontSize: '17px', fontWeight: 900, color: '#f8fafc', margin: 0 }}>PATHS & RUNTIME ENVIRONMENT</h2>
                  <button 
                    onClick={handleScanJavaInstallations}
                    disabled={isScanningJava}
                    style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '9px 16px', borderRadius: '10px', fontWeight: 900, fontSize: '13px', cursor: isScanningJava ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)' }}
                  >
                    <SearchCode size={16} className={isScanningJava ? 'spin-anim' : ''} />
                    {isScanningJava ? 'Scanning Windows...' : 'Scan Java Installations'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {discoveredJavaList.length > 0 && (
                    <div style={{ background: '#0b0b0b', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '14px', padding: '16px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: '#f5f5f5', display: 'block', marginBottom: '10px', letterSpacing: '0.5px' }}>
                        DISCOVERED JAVA RUNTIMES ON SYSTEM:
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                        {discoveredJavaList.map((j, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              setJavaPath(j.path);
                              addToast(`Selected ${j.name}!`);
                            }}
                            style={{ background: javaPath === j.path ? '#292929' : '#111111', border: javaPath === j.path ? '1px solid #f5f5f5' : '1px solid #292929', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>{j.name}</div>
                              <div style={{ fontSize: '11px', color: '#858585', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.path}</div>
                            </div>
                            {j.majorVersion === 69 && (
                              <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)', fontSize: '10px', fontWeight: 900, padding: '2px 8px', borderRadius: '6px', marginLeft: '10px' }}>
                                Java 25 (Major 69)
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Game Directory (.minecraft path)</label>
                    <input type="text" placeholder="Default (%appdata%/.minecraft)" value={gameDir} onChange={(e) => setGameDir(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: '#060606', border: '1px solid #292929', color: '#fff', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Executable Java Binary Path</label>
                    <input type="text" value={javaPath} onChange={(e) => setJavaPath(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: '#060606', border: '1px solid #292929', color: '#fff', borderRadius: '10px', fontSize: '14px', outline: 'none' }} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Custom JVM Launch Flags</label>
                    <input type="text" value={jvmArgs} onChange={(e) => setJvmArgs(e.target.value)} style={{ width: '100%', padding: '12px 16px', background: '#060606', border: '1px solid #292929', color: '#f5f5f5', borderRadius: '10px', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Install a Java runtime</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {[8, 17, 21, 25].map((major) => (
                        <button className="launcher-button" key={major} disabled={javaInstallingVersion !== null} onClick={() => void handleInstallJavaRuntime(major)}>
                          {javaInstallingVersion === major ? `Installing Java ${major}...` : `Install Java ${major}`}
                        </button>
                      ))}
                    </div>
                    <p style={{ color: '#858585', fontSize: '12px', marginTop: '8px' }}>Java is downloaded from Adoptium and stored locally.</p>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'servers' && (
              <div className="panel-card fade-in" style={{ background: '#111111', border: '1px solid #292929', padding: '24px', borderRadius: '16px' }}>
                <h2 className="panel-title" style={{ fontSize: '17px', fontWeight: 900, color: '#f8fafc', marginBottom: '8px' }}>SAVED SERVERS</h2>
                <p style={{ color: '#a1a1a1', marginBottom: '18px' }}>Quick Play uses the Minecraft profile selected for each saved server. Add host or host:port.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', marginBottom: '20px' }}>
                  <input aria-label="Server name" placeholder="Server name" value={newServerName} onChange={(event) => setNewServerName(event.target.value)} />
                  <input aria-label="Server address" placeholder="play.example.net[:port]" value={newServerAddress} onChange={(event) => setNewServerAddress(event.target.value)} />
                  <button className="launcher-button primary" onClick={handleSaveServer}><Plus size={15} /> Save server</button>
                </div>
                {savedServers.length === 0 ? <p style={{ color: '#858585' }}>No servers saved yet.</p> : (
                  <div style={{ display: 'grid', gap: '10px' }}>
                    {savedServers.map((server) => {
                      const profile = installedProfiles.find((item) => item.id === server.profileId);
                      return (
                        <div key={server.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '12px', background: '#0b0b0b', border: '1px solid #292929', borderRadius: '10px' }}>
                          <div>
                            <strong>{server.name}</strong>
                            <div style={{ color: '#a1a1a1', fontSize: '12px' }}>{server.address} · {profile?.title || 'Profile unavailable'}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="launcher-button primary" disabled={!profile || isLaunching} onClick={() => profile && handleLaunchGame(server)}><Play size={14} /> Quick Play</button>
                            <button className="launcher-button danger" onClick={() => setSavedServers((items) => items.filter((item) => item.id !== server.id))}>Remove</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {settingsSubTab === 'console' && (
              <div style={{ background: '#040404', border: '1px solid #292929', borderRadius: '16px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 220px)', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 900, color: '#f5f5f5', fontSize: '14px', letterSpacing: '0.5px' }}>MINECRAFT CONSOLE</span>
                    <span style={{ color: isLaunching ? '#4ade80' : '#a1a1a1', fontSize: '10px', fontWeight: 900, letterSpacing: '0.7px' }}>
                      {isLaunching ? 'RUNNING' : 'STOPPED'}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {(['all', 'error', 'warn', 'info'] as const).map((f) => (
                        <button key={f} onClick={() => setConsoleFilter(f)} style={{ background: consoleFilter === f ? '#f5f5f5' : '#1a1a1a', color: consoleFilter === f ? '#060606' : '#858585', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', cursor: 'pointer' }}>
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CONSOLE HEADER LAUNCH & STOP BUTTONS */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!isLaunching ? (
                      <button 
                        onClick={() => handleLaunchGame()}
                        style={{ 
                          background: '#f5f5f5', 
                          border: '1px solid #292929', 
                          borderRadius: '10px', 
                          padding: '8px 20px', 
                          color: '#111111', 
                          fontSize: '13px', 
                          fontWeight: '900', 
                          cursor: 'pointer', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                        }}
                      >
                        <Play size={14} fill="#111111" color="#111111" /> Launch
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          disabled
                          style={{ 
                            background: '#292929', 
                            border: '1px solid #292929', 
                            borderRadius: '10px', 
                            padding: '8px 16px', 
                            color: 'rgba(255,255,255,0.7)', 
                            fontSize: '13px', 
                            fontWeight: '900', 
                            cursor: 'not-allowed'
                          }}
                        >
                          Running...
                        </button>
                        <button 
                          onClick={handleStopGame}
                          title="Stop Game"
                          style={{ 
                            background: '#dc2626', 
                            border: '1px solid #292929', 
                            borderRadius: '10px', 
                            width: '36px', 
                            height: '36px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            cursor: 'pointer',
                            boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)'
                          }}
                        >
                          <X size={16} color="#ffffff" strokeWidth={3} />
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => void handleOpenStarClientFolder()}
                      title="Open StarClient AppData folder"
                      aria-label="Open StarClient AppData folder"
                      style={{ background: '#1a1a1a', border: '1px solid #3f3f3f', borderRadius: '10px', width: '36px', height: '36px', color: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <FolderOpen size={16} />
                    </button>
                    <button className="action-btn" style={{ color: '#060606', fontWeight: 900, background: '#f5f5f5', border: 'none', padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }} onClick={() => setLaunchLogs([])}>Clear Log</button>
                  </div>
                </div>

                {crashReports.length > 0 && (
                  <div style={{ padding: '10px', marginBottom: '10px', border: '1px solid #292929', borderRadius: '8px' }}>
                    <strong style={{ color: '#fca5a5' }}>Crash reports</strong>
                    {crashReports.map((report) => (
                      <button className="launcher-button" key={report.name} onClick={() => void handleOpenCrashReport(report.name)} style={{ margin: '6px' }}>
                        <FileWarning size={14} /> {report.name}
                      </button>
                    ))}
                  </div>
                )}
                <div ref={logScrollRef} style={{ flex: 1, overflowY: 'auto', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: '#f5f5f5', lineHeight: 1.6, background: '#020407', padding: '16px', borderRadius: '12px', border: '1px solid #181818' }}>
                  {launchLogs
                    .filter((log) => {
                      if (consoleFilter === 'error') return log.includes('CRASH') || log.includes('ERROR') || log.includes('Exception');
                      if (consoleFilter === 'warn') return log.includes('WARN');
                      if (consoleFilter === 'info') return log.includes('Auth') || log.includes('StarClient');
                      return true;
                    })
                    .map((log, index) => (
                      <div key={index} style={{ color: log.includes('CRASH') || log.includes('ERROR') ? '#ef4444' : (log.includes('WARN') ? '#f59e0b' : '#f5f5f5') }}>{log}</div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* POP-UP MODAL: MOD VERSION & LOADER SELECTOR */}
      {selectedModForDownload && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, overflow: 'visible' }}>
          <div className="fade-in" style={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '18px', width: '520px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', position: 'relative', zIndex: 1260 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedModForDownload.icon_url ? (
                  <img src={selectedModForDownload.icon_url} alt={selectedModForDownload.title} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Puzzle size={18} color="#f5f5f5" />
                  </div>
                )}
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#fff', margin: 0 }}>{selectedModForDownload.title}</h2>
                  <span style={{ fontSize: '11px', color: '#858585' }}>Select Target Version & Loader</span>
                </div>
              </div>
              <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setSelectedModForDownload(null)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '26px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Target Minecraft Version</label>
                <CustomDropdown 
                  options={modsCategory === 'modpacks' || !activeProfile
                    ? versionOptions
                    : [{ label: `${activeProfile.title} (${activeProfile.version})`, value: activeProfile.version }]} 
                  value={modalModVersion} 
                  onChange={setModalModVersion} 
                  stackOrder={200}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Target Mod Loader</label>
                <CustomDropdown 
                  options={[
                    { label: 'Fabric (Supported)', value: 'Fabric' }
                  ]} 
                  value={modalModLoader} 
                  onChange={setModalModLoader} 
                  stackOrder={100}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setSelectedModForDownload(null)}
                style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmModDownloadFromModal}
                style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)' }}
              >
                <Download size={16} /> Confirm & Download Mod
              </button>
            </div>

          </div>
        </div>
      )}

      {/* WIZARD MODAL FOR PROFILE INSTANCE CREATION */}
      {activeCatalogGroup && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1250, overflow: 'visible' }}>
          <div className="fade-in" style={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '18px', width: '560px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', maxHeight: '90vh', overflow: 'visible', position: 'relative', zIndex: 1260 }}>
            
            {wizardStep === 1 && (
              <div style={{ overflow: 'visible' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Layers size={20} color="#f5f5f5" /> Step 1: Select Version for {activeCatalogGroup.title}
                  </h2>
                  <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setActiveCatalogGroup(null)} />
                </div>

                <p style={{ fontSize: '13px', color: '#858585', marginBottom: '20px', lineHeight: 1.5 }}>
                  Choose your target sub-version from the dropdown below:
                </p>

                <div style={{ marginBottom: '32px', overflow: 'visible', position: 'relative' }}>
                  <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '8px', fontWeight: 800 }}>Target Version</label>
                  <CustomDropdown 
                    options={activeCatalogGroup.versions} 
                    value={wizardSelectedVersion} 
                    onChange={setWizardSelectedVersion} 
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button 
                    onClick={() => setActiveCatalogGroup(null)}
                    style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => setWizardStep(2)}
                    style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 22px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Puzzle size={20} color="#f5f5f5" /> Step 2: Select Mod Loader
                  </h2>
                  <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setActiveCatalogGroup(null)} />
                </div>

                <p style={{ fontSize: '13px', color: '#858585', marginBottom: '16px', lineHeight: 1.4 }}>
                  Select your mod loader runtime environment:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
                  {LOADER_OPTIONS_DATA.map((loader) => {
                    const isSelected = wizardSelectedLoader === loader.id;

                    return (
                      <div 
                        key={loader.id}
                        onClick={() => setWizardSelectedLoader(loader.id)}
                        style={{ 
                          background: '#0b0b0b', 
                          border: isSelected ? '2px solid #f5f5f5' : '1px solid #292929', 
                          borderRadius: '14px', 
                          padding: '14px 18px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between', 
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 0 15px rgba(255, 255, 255, 0.15)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0, flex: 1 }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                            <img src={loader.icon} alt={loader.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png'; }} />
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>{loader.name}</span>
                              {loader.badge && (
                                <span style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.4)', fontSize: '9px', fontWeight: 900, padding: '2px 8px', borderRadius: '6px' }}>
                                  {loader.badge}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: '12px', color: '#858585', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loader.subtitle}</p>
                          </div>
                        </div>

                        <div style={{ marginLeft: '16px', flexShrink: 0 }}>
                          {isSelected ? (
                            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check size={14} color="#060606" strokeWidth={3} />
                            </div>
                          ) : (
                            <Circle size={22} color="#3f3f3f" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => setWizardStep(1)}
                    style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={() => setWizardStep(3)}
                    style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 22px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    Next <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 3 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ClipboardCheck size={20} color="#f5f5f5" />                     Step 3: Review & Install Mods
                  </h2>
                  <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setActiveCatalogGroup(null)} />
                </div>

                <p style={{ fontSize: '13px', color: '#858585', marginBottom: '14px', lineHeight: 1.4 }}>
                  These <strong style={{ color: '#f5f5f5' }}>{PERFORMANCE_AUTO_MODS.length} compatible performance mods</strong> will be installed now. Minecraft game files download the first time you launch this profile:
                </p>

                <div style={{ background: '#0b0b0b', border: '1px solid #292929', borderRadius: '12px', padding: '12px', maxHeight: '220px', overflowY: 'auto', marginBottom: '18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {PERFORMANCE_AUTO_MODS.map((mod) => (
                    <div key={mod.project_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111111', padding: '10px 12px', borderRadius: '10px', border: '1px solid #292929', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <img src={mod.icon_url} alt={mod.title} style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).src = 'https://cdn.modrinth.com/data/P7dR8mSH/icon.png'; }} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: 900, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.title}</div>
                          <div style={{ fontSize: '10px', color: '#858585', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.description}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#22c55e', flexShrink: 0 }}>Compatible</span>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#1a1a1a', borderRadius: '10px', padding: '12px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: '#858585', fontWeight: 800 }}>Target Version: </span>
                    <strong style={{ color: '#fff' }}>{wizardSelectedVersion}</strong> ({wizardSelectedLoader})
                  </div>
                  <span style={{ color: '#f5f5f5', fontWeight: 900 }}>10 Mods Included</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button 
                    onClick={() => setWizardStep(2)}
                    style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                  <button 
                    onClick={handleStartWizardCreation}
                    style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 24px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)' }}
                  >
                    Create Profile & Download Mods
                  </button>
                </div>
              </div>
            )}

            {wizardStep === 4 && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px auto' }}>
                  <Download size={28} color="#f5f5f5" className="spin-anim" />
                </div>

                <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', marginBottom: '6px' }}>Downloading & Installing Profile</h2>
                <p style={{ fontSize: '13px', color: '#f5f5f5', fontWeight: 800, marginBottom: '24px' }}>{wizardStatusText}</p>

                <div style={{ background: '#060606', borderRadius: '12px', padding: '16px', border: '1px solid #292929', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', fontWeight: 900 }}>
                    <span style={{ color: '#858585' }}>Overall Progress</span>
                    <span style={{ color: '#f5f5f5' }}>{wizardProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1a1a1a', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${wizardProgress}%`, height: '100%', background: 'linear-gradient(90deg, #f5f5f5, #bdbdbd)', transition: 'width 0.3s ease' }} />
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: '#858585' }}>Installing compatible performance mods. Minecraft runtime files download when you launch the profile.</p>
              </div>
            )}

          </div>
        </div>
      )}

      {/* INSTANCE DETAIL MODAL */}
      {selectedInstanceDetail && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', zIndex: 1100 }}>
          <div className="fade-in" style={{ background: '#111111', borderLeft: '1px solid #292929', width: '460px', height: '100vh', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box', overflowY: 'auto', boxShadow: '-20px 0 50px rgba(0,0,0,0.9)' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <span style={{ background: '#f5f5f5', color: '#060606', fontSize: '11px', fontWeight: 900, padding: '4px 12px', borderRadius: '6px', textTransform: 'uppercase' }}>
                  {selectedInstanceDetail.loader}
                </span>
                <X size={22} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setSelectedInstanceDetail(null)} />
              </div>

              <div style={{ position: 'relative', height: '180px', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px', backgroundImage: `url(${selectedInstanceDetail.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>

              <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#fff', margin: '0 0 4px 0' }}>{selectedInstanceDetail.title}</h2>
              <p style={{ fontSize: '13px', color: '#f5f5f5', fontWeight: 900, marginBottom: '20px' }}>Version {selectedInstanceDetail.version} • {selectedInstanceDetail.loader}</p>

              <div style={{ background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#858585', fontWeight: 800 }}>Minecraft</span>
                  <span style={{ color: '#fff', fontWeight: 900 }}>{selectedInstanceDetail.version}</span>
                </div>
                <div style={{ height: '1px', background: '#292929' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span style={{ color: '#858585', fontWeight: 800 }}>Last played</span>
                  <span style={{ color: '#fff', fontWeight: 900 }}>{selectedInstanceDetail.lastPlayed || 'Recently'}</span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: '#858585', lineHeight: 1.6, marginBottom: '20px' }}>
                {selectedInstanceDetail.description}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', paddingTop: '20px', borderTop: '1px solid #292929' }}>
              <button 
                onClick={() => {
                  setActiveProfileId(selectedInstanceDetail.id);
                  setMcVersion(selectedInstanceDetail.version);
                  setSelectedInstanceDetail(null);
                  handleLaunchGame();
                }}
                style={{ flex: 1, height: '48px', background: '#f5f5f5', border: 'none', borderRadius: '12px', color: '#060606', fontWeight: 900, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 2px 10px rgba(255, 255, 255, 0.2)' }}
              >
                <Play size={18} fill="#060606" /> Launch Profile
              </button>

              <button 
                onClick={() => handleExportBackup(selectedInstanceDetail)}
                style={{ width: '48px', height: '48px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', color: '#f5f5f5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Export Backup (.zip)"
              >
                <Archive size={20} />
              </button>

              <button 
                onClick={() => {
                  const inst = selectedInstanceDetail;
                  setSelectedInstanceDetail(null);
                  setEditingInstance(inst);
                }}
                style={{ width: '48px', height: '48px', background: '#1a1a1a', border: '1px solid #292929', borderRadius: '12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Edit Instance Settings"
              >
                <Settings2 size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INSTANCE MODAL */}
      {editingInstance && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '18px', width: '500px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 size={20} color="#f5f5f5" /> Edit Profile Settings
              </h2>
              <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setEditingInstance(null)} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '6px', fontWeight: 800 }}>Profile Name</label>
                <input 
                  type="text" 
                  value={editingInstance.title}
                  onChange={(e) => setEditingInstance({ ...editingInstance, title: e.target.value })}
                  style={{ width: '100%', padding: '12px 16px', background: '#060606', border: '1px solid #292929', color: '#fff', borderRadius: '10px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '6px', fontWeight: 800 }}>Mod Loader</label>
                <CustomDropdown 
                  options={[{ label: 'Fabric', value: 'Fabric' }, { label: 'Forge', value: 'Forge' }, { label: 'NeoForge', value: 'NeoForge' }, { label: 'Quilt', value: 'Quilt' }]} 
                  value={editingInstance.loader} 
                  onChange={(val) => setEditingInstance({ ...editingInstance, loader: val as any })} 
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#858585', display: 'block', marginBottom: '6px', fontWeight: 800 }}>Description</label>
                <textarea 
                  value={editingInstance.description}
                  onChange={(e) => setEditingInstance({ ...editingInstance, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '12px 16px', background: '#060606', border: '1px solid #292929', color: '#fff', borderRadius: '10px', outline: 'none', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '10px' }}>
                <button 
                  onClick={() => handleDeleteInstance(editingInstance.id)} 
                  style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={16} /> Delete
                </button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setEditingInstance(null)} style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>Cancel</button>
                  <button 
                    onClick={handleSaveEditedInstance} 
                    style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 22px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG OUT CONFIRMATION MODAL */}
      {accountToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1300 }}>
          <div className="fade-in" style={{ background: '#111111', border: '1px solid #ef4444', borderRadius: '18px', width: '440px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.9)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={20} color="#ef4444" /> Confirm Log Out
              </h2>
              <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setAccountToDelete(null)} />
            </div>

            <p style={{ fontSize: '14px', color: '#858585', lineHeight: 1.5, marginBottom: '24px' }}>
              Are you sure you want to log out and remove account <strong style={{ color: '#fff' }}>{accountToDelete.username}</strong> ({accountToDelete.type}) from StarClient?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => setAccountToDelete(null)}
                style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmLogout}
                style={{ background: '#ef4444', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ACCOUNT MODAL */}
      {isAddAccountModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
          <div style={{ background: '#111111', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '18px', width: '520px', padding: '28px', boxShadow: '0 20px 40px rgba(0,0,0,0.9)' }}>
            
            {addAccountStep === 'selector' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#f5f5f5" /> Add New Account
                  </h2>
                  <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setIsAddAccountModalOpen(false)} />
                </div>

                <p style={{ fontSize: '13px', color: '#858585', marginBottom: '20px' }}>Select the account type you would like to add to StarClient:</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <button
                    className="account-option microsoft-account-option"
                    onClick={() => addToast('Coming Soon', 'info')}
                    title="Microsoft login is coming soon"
                    aria-label="Microsoft login, coming soon"
                    style={{ background: '#0b0b0b', border: '1px solid #292929', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Key size={22} color="#a1a1a1" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', margin: 0 }}>Microsoft</h4>
                      <p style={{ fontSize: '12px', color: '#858585', margin: '4px 0 0 0' }}>Coming Soon</p>
                    </div>
                  </button>

                  <div 
                    onClick={() => setAddAccountStep('offline')}
                    style={{ background: '#0b0b0b', border: '1px solid #292929', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', cursor: 'pointer', textAlign: 'center' }}
                  >
                    <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Users size={22} color="#f5f5f5" />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 900, color: '#fff', margin: 0 }}>Offline</h4>
                      <p style={{ fontSize: '12px', color: '#858585', margin: '4px 0 0 0' }}>Custom username</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {addAccountStep === 'offline' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="#f5f5f5" /> Add Offline Account
                  </h2>
                  <X size={20} style={{ cursor: 'pointer', color: '#858585' }} onClick={() => setIsAddAccountModalOpen(false)} />
                </div>

                <p style={{ fontSize: '13px', color: '#858585', lineHeight: 1.5, marginBottom: '16px' }}>
                  Enter your desired offline player username below:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <input 
                    type="text" 
                    placeholder="Enter Username (e.g. Steve)" 
                    value={offlineUsernameInput}
                    onChange={(e) => setOfflineUsernameInput(e.target.value)}
                    style={{ width: '100%', padding: '14px', background: '#060606', border: '1px solid #292929', color: '#fff', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                    <button 
                      onClick={() => setAddAccountStep('selector')}
                      style={{ background: 'transparent', border: 'none', color: '#858585', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                    >
                      ← Back
                    </button>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => setIsAddAccountModalOpen(false)}
                        style={{ background: '#1a1a1a', border: '1px solid #292929', color: '#fff', padding: '10px 16px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleAddOfflineAccount}
                        style={{ background: 'linear-gradient(135deg, #f5f5f5, #bdbdbd)', border: 'none', color: '#060606', padding: '10px 20px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer', fontSize: '13px' }}
                      >
                        Add Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}