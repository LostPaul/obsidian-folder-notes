import type { TAbstractFile, TFile, TFolder, View, WorkspaceLeaf } from 'obsidian';

declare module 'obsidian' {
	interface Setting {
		createList: (list: ListComponent | ((list: ListComponent) => void)) => ListComponent;
	}
	interface TFolder {
		newName: string | null;
		collapsed: boolean;
	}
	interface MenuItem {
		dom: HTMLElement;
	}
	interface FileManager {
		promptForFolderDeletion: (folder: TFolder) => void;
	}

	class ListComponent {
		containerEl: HTMLElement;
		emptyStateEl: HTMLElement;
		listEl: HTMLElement;
		values: string[];
		constructor(containerEl: HTMLElement);
	}
}

interface FileExplorerWorkspaceLeaf extends WorkspaceLeaf {
	containerEl: HTMLElement;
	view: FileExplorerView;
}

interface FileExplorerViewFileItem extends TAbstractFile {
	titleEl: HTMLElement;
	selfEl: HTMLElement;
	setCollapsed?: (collapsed: boolean) => void;
}

type FileOrFolderItem = FolderItem | FileItem;

interface FileItem {
    el: HTMLDivElement;
    file: TFile;
    fileExplorer: FileExplorerView;
    selfEl: HTMLDivElement;
    innerEl: HTMLDivElement;
}

interface FolderItem {
    el: HTMLDivElement;
    fileExplorer: FileExplorerView;
    selfEl: HTMLDivElement;
    innerEl: HTMLDivElement;
    file: TFolder;
    children: FileOrFolderItem[];
    childrenEl: HTMLDivElement;
    collapseIndicatorEl: HTMLDivElement;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    pusherEl: HTMLDivElement;
}

interface TreeItem {
    focusedItem: FileOrFolderItem;
	infinityScroll?: {
		rootMargin: number;
		scrollIntoView: (item: FileExplorerViewFileItem, margin: number) => void;
	};
    setFocusedItem: (item: FileOrFolderItem, moveViewport: boolean) => void;
    selectedDoms: Set<FileOrFolderItem>;
}
interface FileExplorerView extends View {
	autoRevealFile?: boolean;
	fileItems: { [path: string]: FileExplorerViewFileItem };
    activeDom: FileOrFolderItem;
    tree: TreeItem;
}

declare global {
	interface Window {
		i18next: {
			t: (key: string, options?: { [key: string]: string }) => string;
		};
	}
}
