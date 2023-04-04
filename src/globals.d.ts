import { Plugin, TAbstractFile, View, WorkspaceLeaf } from 'obsidian';

declare module 'obsidian' {
	interface App {
		internalPlugins: {
			plugins: {
				[pluginId: string]: Plugin & {
					[pluginImplementations: string]: unknown;
				};
			};
			enablePlugin: (id: string) => Promise<void>;
			disablePlugin: (id: string) => Promise<void>;
		};
	}
}

interface FileExplorerWorkspaceLeaf extends WorkspaceLeaf {
  containerEl: HTMLElement;
  view: FileExplorerView;
}

interface FileExplorerViewFileItem extends TAbstractFile {
	titleEl: HTMLElement
}

interface FileExplorerView extends View {
  fileItems: { [path: string]: FileExplorerViewFileItem };
}
