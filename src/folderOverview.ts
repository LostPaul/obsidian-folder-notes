import { MarkdownPostProcessorContext, parseYaml, TAbstractFile, TFolder, TFile } from 'obsidian';
import { getFolderNote } from './functions/folderNoteFunctions';
import FolderNotesPlugin from './main';
export type yamlSettings = {
	title?: string;
	disableTitle?: boolean;
	depth?: number;
	type?: 'folder' | 'markdown' | 'canvas';
	includeTypes?: string[];
	style?: 'list' | 'grid';
	disableCanvasTag?: boolean;
};

export function createCanvasOverview() {
	// console.log('test');
}

export function createOverview(plugin: FolderNotesPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
	// parse source to yaml
	const yaml = parseYaml(source);
	const depth = yaml?.depth || 1;
	const title = yaml?.title || plugin.settings.defaultOverview.title || 'Folder overview';
	const disableTitle = yaml?.disableTitle || plugin.settings.defaultOverview.disableTitle || false;
	let includeTypes: string[] = yaml?.includeTypes || plugin.settings.defaultOverview.includeTypes || ['folder', 'markdown'];
	includeTypes = includeTypes.map((type) => type.toLowerCase());
	const style: 'list' | 'grid' = yaml?.style || 'list';
	const disableCanvasTag = yaml?.disableCanvasTag || plugin.settings.defaultOverview.disableCanvasTag || false;

	const root = el.createEl('div', { cls: 'folder-overview' });
	const titleEl = root.createEl('h1', { cls: 'folder-overview-title' });
	const ul = root.createEl('ul', { cls: 'folder-overview-list' });
	if (!disableTitle) {
		titleEl.innerText = title;
	}
	if (includeTypes.length === 0) { return; }
	let files: TAbstractFile[] = [];
	const sourceFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	if (!sourceFile) return;
	const sourceFolderPath = plugin.getFolderPathFromString(ctx.sourcePath);
	let sourceFolder: TFolder | undefined;

	if (sourceFile.parent instanceof TFolder) {
		sourceFolder = sourceFile.parent;
	} else {
		sourceFolder = plugin.app.vault.getAbstractFileByPath(plugin.getFolderPathFromString(ctx.sourcePath)) as TFolder;
	}

	files = sourceFolder.children;

	files = files.filter((file) => {
		const folderPath = plugin.getFolderPathFromString(file.path);
		if (!folderPath.startsWith(sourceFolderPath)) { return false; }
		if (file.path === ctx.sourcePath) { return false; }
		if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth) {
			return true;
		}
	});
	if (!includeTypes.includes('folder')) {
		files = getAllFiles(files, sourceFolderPath, depth);
	}
	files = sortFiles(files);

	if (style === 'grid') {
		const grid = root.createEl('div', { cls: 'folder-overview-grid' });
		files.forEach(async (file) => {
			const gridItem = grid.createEl('div', { cls: 'folder-overview-grid-item' });
			const gridArticle = gridItem.createEl('article', { cls: 'folder-overview-grid-item-article' });
			if (file instanceof TFile) {
				const fileContent = await plugin.app.vault.read(file);
				// skip --- yaml
				const descriptionEl = gridArticle.createEl('p', { cls: 'folder-overview-grid-item-description' });
				let description = fileContent.split('\n')[0];
				if (description.length > 64) {
					description = description.slice(0, 64) + '...';
				}
				descriptionEl.innerText = description;
				const link = gridArticle.createEl('a', { cls: 'folder-overview-grid-item-link internal-link' });
				const title = link.createEl('h1', { cls: 'folder-overview-grid-item-link-title' });
				title.innerText = file.name.replace('.md', '').replace('.canvas', '');
				link.href = file.path;
			} else if (file instanceof TFolder) {
				const folderItem = gridArticle.createEl('div', { cls: 'folder-overview-grid-item-folder' });
				const folderName = folderItem.createEl('h1', { cls: 'folder-overview-grid-item-folder-name' });
				folderName.innerText = file.name;
			}
		});
	} else if (style === 'list') {
		const pathBlacklist: string[] = [];
		files.forEach((file) => {
			if (file instanceof TFolder) {
				const folderItem = addFolderList(plugin, ul, pathBlacklist, file);
				goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist, includeTypes, disableCanvasTag);
			} else if (file instanceof TFile) {
				addFileList(plugin, ul, pathBlacklist, file, includeTypes, disableCanvasTag);
			}
		});
	} else if (style === 'explorer') {
		/*
		const view = plugin.getFileExplorerView();
		const folderElement = plugin.getEL(plugin.getFolderPathFromString(ctx.sourcePath))?.parentElement;
		if (!folderElement) return;
		// copy folderElement
		const newFolderElement = folderElement.cloneNode(true) as HTMLElement;
		newFolderElement.querySelectorAll('.nav-folder').forEach((el) => {
			el.classList.remove('is-collapsed');
		});
		root.appendChild(folderElement);
		*/
	}
	if (includeTypes.length > 1 && style !== 'grid') {
		removeEmptyFolders(ul);
	}
}

function goThroughFolders(plugin: FolderNotesPlugin, list: HTMLLIElement | HTMLUListElement, folder: TFolder,
	depth: number, sourceFolderPath: string, ctx: MarkdownPostProcessorContext, yaml: yamlSettings, pathBlacklist: string[], includeTypes: string[], disableCanvasTag: boolean) {
	let files = folder.children.filter((file) => {
		const folderPath = plugin.getFolderPathFromString(file.path);
		if (!folderPath.startsWith(sourceFolderPath)) { return false; }
		if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth) {
			return true;
		}
	});
	files = sortFiles(files);
	const ul = list.createEl('ul', { cls: 'folder-overview-list' });
	files.forEach((file) => {
		if (file instanceof TFolder) {
			const folderItem = addFolderList(plugin, ul, pathBlacklist, file);
			goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist, includeTypes, disableCanvasTag);
		} else if (file instanceof TFile) {
			addFileList(plugin, ul, pathBlacklist, file, includeTypes, disableCanvasTag);
		}
	});
}

function sortFiles(files: TAbstractFile[]) {
	return files.sort((a, b) => {
		// sort by folder first
		if (a instanceof TFolder && !(b instanceof TFolder)) {
			return -1;
		}
		if (!(a instanceof TFolder) && b instanceof TFolder) {
			return 1;
		}
		// sort by name
		if (a.name < b.name) {
			return -1;
		}
		if (a.name > b.name) {
			return 1;
		}
		return 0;
	});
}

function removeEmptyFolders(ul: HTMLUListElement | HTMLLIElement) {
	const childrensToRemove: ChildNode[] = [];
	ul.childNodes.forEach((el) => {
		const childrens = (el as Element).querySelector('ul');
		if (!childrens || childrens === null) { return; }
		if (childrens && !childrens?.hasChildNodes() && !(el instanceof HTMLUListElement)) {
			childrensToRemove.push(el);
		} else if (el instanceof HTMLUListElement || el instanceof HTMLLIElement) {
			removeEmptyFolders(el);
		}
	});
	childrensToRemove.forEach((el) => {
		el.remove();
	});
}

function addFolderList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], folder: TFolder) {
	const folderItem = list.createEl('li', { cls: 'folder-overview-list folder-list' });
	const folderNote = getFolderNote(plugin, folder.path);
	if (folderNote instanceof TFile) {
		const folderNoteLink = folderItem.createEl('a', { cls: 'folder-overview-list-item folder-name-item internal-link', href: folderNote.path });
		folderNoteLink.innerText = folder.name;
		pathBlacklist.push(folderNote.path);
	} else {
		const folderName = folderItem.createEl('span', { cls: 'folder-overview-list-item folder-name-item' });
		folderName.innerText = folder.name;
	}
	return folderItem;
}

function addFileList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], file: TFile, includeTypes: string[], disableCanvasTag: boolean) {
	if (includeTypes.length > 0) {
		if (file.extension === 'md' && !includeTypes.includes('markdown')) return;
		if (file.extension === 'canvas' && !includeTypes.includes('canvas')) return;
	}
	if (pathBlacklist.includes(file.path)) return;
	const listItem = list.createEl('li', { cls: 'folder-overview-list file-link' });
	const nameItem = listItem.createEl('div', { cls: 'folder-overview-list-item' });
	const link = nameItem.createEl('a', { cls: 'internal-link', href: file.path });
	link.innerText = file.name.replace('.md', '').replace('.canvas', '');
	if (file.extension === 'canvas' && !disableCanvasTag) {
		nameItem.createDiv({ cls: 'nav-file-tag' }).innerText = 'canvas';
	}
}

function getAllFiles(files: TAbstractFile[], sourceFolderPath: string, depth: number) {
	const allFiles: TAbstractFile[] = [];
	files.forEach((file) => {
		if (file instanceof TFolder) {
			if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth - 1) {
				allFiles.push(...getAllFiles(file.children, sourceFolderPath, depth));
			}
		} else {
			allFiles.push(file);
		}
	});
	return allFiles;
}
