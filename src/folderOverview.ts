import { MarkdownPostProcessorContext, parseYaml, TAbstractFile, TFolder, TFile } from 'obsidian';
import { getFolderNote } from './folderNoteFunctions';
import FolderNotesPlugin from './main';
export function createCanvasOverview() {
	// console.log('test');
}

export function createOverview(plugin: FolderNotesPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
	// parse source to yaml
	const yaml = parseYaml(source);
	const depth = yaml?.depth || 1;
	const title = yaml?.title || 'Overview';
	const type: 'folder' | 'markdown' | 'canvas' = yaml?.type.trim() || 'markdown';
	const style: 'list' | 'grid' = yaml?.style || 'grid';
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
	if (type === 'folder') {
		files = files.filter((file) => file instanceof TFolder);
	} else if (type === 'canvas') {
		files = files.filter((file) => file instanceof TFolder || file.name.endsWith('.canvas'));
	} else if (type === 'markdown') {
		files = files.filter((file) => file instanceof TFolder || file.name.endsWith('.md'));
	}

	files = files.filter((file) => {
		const folderPath = plugin.getFolderPathFromString(file.path);
		if (!folderPath.startsWith(sourceFolderPath)) { return false; }
		if (file.path === ctx.sourcePath) { return false; }
		if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth) {
			return true;
		}
	});
	files = sortFiles(files);


	const root = el.createEl('div', { cls: 'folder-overview' });
	const titleEl = root.createEl('h1', { cls: 'folder-overview-title' });
	const ul = root.createEl('ul', { cls: 'folder-overview-list' });
	titleEl.innerText = title;
	if (style === 'grid') {
		const grid = root.createEl('div', { cls: 'folder-overview-grid' });
		files.forEach((file) => {
			const gridItem = grid.createEl('div', { cls: 'folder-overview-grid-item' });
			const link = gridItem.createEl('a', { cls: 'folder-overview-grid-item-link' });
			link.innerText = file.name.replace('.md', '').replace('.canvas', '');
			if (!(file instanceof TFile)) return;
			link.href = plugin.app.fileManager.generateMarkdownLink(file, '', ctx.sourcePath);
		});
	} else if (style === 'list') {
		const pathBlacklist: string[] = [];
		files.forEach((file) => {
			if (file instanceof TFolder) {
				const folderItem = ul.createEl('li', { cls: 'folder-overview-list folder-list' });
				const folderNote = getFolderNote(plugin, file.path);
				if (folderNote instanceof TFile) {
					const folderNoteLink = folderItem.createEl('a', { cls: 'folder-overview-list-item folder-name-item internal-link', href: folderNote.path });
					folderNoteLink.innerText = file.name;
					pathBlacklist.push(folderNote.path);
				} else {
					const folderName = folderItem.createEl('span', { cls: 'folder-overview-list-item folder-name-item' });
					folderName.innerText = file.name;
				}
				goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist);
			} else if (file instanceof TFile) {
				if (type === 'canvas' && !file.name.endsWith('.canvas')) return;
				if (pathBlacklist.includes(file.path)) return;
				const listItem = root.createEl('li', { cls: 'folder-overview-list' });
				const link = listItem.createEl('a', { cls: 'internal-link', href: file.path });
				link.innerText = file.name.replace('.md', '').replace('.canvas', '');
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
	removeEmptyFolders(ul);
}

function goThroughFolders(plugin: FolderNotesPlugin, list: HTMLLIElement, folder: TFolder,
	depth: number, sourceFolderPath: string, ctx: MarkdownPostProcessorContext, yaml: any = {}, pathBlacklist: string[]) {
	let files = folder.children.filter((file) => {
		const folderPath = plugin.getFolderPathFromString(file.path);
		if (!folderPath.startsWith(sourceFolderPath)) { return false; }
		if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth) {
			return true;
		}
	});

	const type: 'folder' | 'markdown' | 'canvas' = yaml?.type || 'markdown';
	if (type === 'folder') {
		files = files.filter((file) => file instanceof TFolder);
	} else if (type === 'canvas') {
		files = files.filter((file) => file instanceof TFolder || file.name.endsWith('.canvas'));
	} else if (type === 'markdown') {
		files = files.filter((file) => file instanceof TFolder || file.name.endsWith('.md'));
	}
	files = sortFiles(files);
	const ul = list.createEl('ul', { cls: 'folder-overview-list' });
	files.forEach((file) => {
		if (file instanceof TFolder) {
			const folderItem = ul.createEl('li', { cls: 'folder-overview-list folder-list' });
			const folderNote = getFolderNote(plugin, file.path);
			if (folderNote instanceof TFile) {
				const folderNoteLink = folderItem.createEl('a', { cls: 'folder-overview-list-item folder-name-item internal-link', href: folderNote.path });
				folderNoteLink.innerText = file.name;
				pathBlacklist.push(folderNote.path);
			} else {
				const folderName = folderItem.createEl('span', { cls: 'folder-overview-list-item folder-name-item' });
				folderName.innerText = file.name;
			}
			goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist);
		} else if (file instanceof TFile) {
			if (type === 'canvas' && !file.name.endsWith('.canvas')) return;
			if (pathBlacklist.includes(file.path)) return;
			const listItem = ul.createEl('li', { cls: 'folder-overview-list' });
			const link = listItem.createEl('a', { cls: 'internal-link', href: file.path });
			link.innerText = file.name.replace('.md', '').replace('.canvas', '');
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
