import { MarkdownPostProcessorContext, parseYaml, TAbstractFile, TFolder, TFile } from 'obsidian';
import { extractFolderName, getFolderNote } from './functions/folderNoteFunctions';
import FolderNotesPlugin from './main';
import { FolderOverviewSettings } from './modals/folderOverview';
import { getExcludedFolder } from './excludedFolder';
export type yamlSettings = {
    title: string;
    disableTitle: boolean;
    depth: number;
    type: 'folder' | 'markdown' | 'canvas' | 'other' | 'pdf' | 'images' | 'audio' | 'video' | 'all';
    includeTypes: string[];
    style: 'list' | 'grid';
    disableFileTag: boolean;
    sortBy: 'name' | 'created' | 'modified' | 'nameAsc' | 'createdAsc' | 'modifiedAsc';
    showEmptyFolders: boolean;
    onlyIncludeSubfolders: boolean;
};
export class FolderOverview {
    yaml: yamlSettings;
    plugin: FolderNotesPlugin;
    ctx: MarkdownPostProcessorContext;
    source: string;
    folderName: string | null;
    el: HTMLElement;
    pathBlacklist: string[] = [];
    folders: TFolder[] = [];
    constructor(plugin: FolderNotesPlugin, ctx: MarkdownPostProcessorContext, source: string, el: HTMLElement) {
        let yaml: yamlSettings = parseYaml(source);
        const includeTypes = yaml?.includeTypes || plugin.settings.defaultOverview.includeTypes || ['folder', 'markdown'];
        this.plugin = plugin;
        this.ctx = ctx;
        this.source = source;
        this.el = el;
        this.yaml = {
            title: yaml?.title || plugin.settings.defaultOverview.title || '{{folderName}} overview',
            disableTitle: yaml?.disableTitle || plugin.settings.defaultOverview.disableTitle || false,
            depth: yaml?.depth || plugin.settings.defaultOverview.depth || 1,
            style: yaml?.style || 'list',
            includeTypes: includeTypes.map((type) => type.toLowerCase()),
            disableFileTag: yaml?.disableFileTag || plugin.settings.defaultOverview.disableFileTag || false,
            sortBy: yaml?.sortBy || plugin.settings.defaultOverview.sortBy || 'name',
            showEmptyFolders: yaml?.showEmptyFolders || plugin.settings.defaultOverview.showEmptyFolders || false,
            onlyIncludeSubfolders: yaml?.onlyIncludeSubfolders || plugin.settings.defaultOverview.onlyIncludeSubfolders || false,
            type: yaml?.type || plugin.settings.defaultOverview.type || 'folder',
        }
    }
    create(plugin: FolderNotesPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        el.parentElement?.classList.add('folder-overview-container');
        const root = el.createEl('div', { cls: 'folder-overview' });
        const titleEl = root.createEl('h1', { cls: 'folder-overview-title' });
        const ul = root.createEl('ul', { cls: 'folder-overview-list' });
        if (!this.yaml.disableTitle) {
            titleEl.innerText = this.yaml.title || '';
        }
        if (this.yaml.includeTypes.length === 0) { return; }
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
            const excludedFolder = getExcludedFolder(plugin, file.path);
            if (excludedFolder?.excludeFromFolderOverview) { return false; }
            if (file.path === ctx.sourcePath) { return false; }
            if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < this.yaml.depth) {
                return true;
            }
        });
        if (!this.yaml.includeTypes.includes('folder')) {
            files = this.getAllFiles(files, sourceFolderPath, this.yaml.depth);
        }
        if (files.length === 0) {
            // create button to edit the overview
            const editButton = root.createEl('button', { cls: 'folder-overview-edit-button' });
            editButton.innerText = 'Edit overview';
            editButton.addEventListener('click', (e) => {
                e.stopImmediatePropagation();
                e.preventDefault();
                e.stopPropagation();
                new FolderOverviewSettings(plugin.app, plugin, parseYaml(source), ctx, el).open();
            }, { capture: true });
        }
        files = this.sortFiles(files, this.yaml, plugin);

        if (this.yaml.style === 'grid') {
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
        } else if (this.yaml.style === 'list') {
            files.forEach((file) => {
                if (file instanceof TFolder) {
                    const folderItem = this.addFolderList(plugin, ul, this.pathBlacklist, file);
                    this.goThroughFolders(plugin, folderItem, file, this.yaml.depth, sourceFolderPath, ctx, this.yaml, this.pathBlacklist, this.yaml.includeTypes, this.yaml.disableFileTag);
                } else if (file instanceof TFile) {
                    this.addFileList(plugin, ul, this.pathBlacklist, file, this.yaml.includeTypes, this.yaml.disableFileTag);
                }
            });
        } else if (this.yaml.style === 'explorer') {
        } else if (this.yaml.style === 'testing') {
            console.log('testing');
            this.cloneFileExplorerView(plugin, ctx, root, this.yaml, this.pathBlacklist);
        }
        if (this.yaml.includeTypes.length > 1 && this.yaml.style !== 'grid' && (!this.yaml.showEmptyFolders || this.yaml.onlyIncludeSubfolders)) {
            this.removeEmptyFolders(ul, 1, this.yaml);
        }
    }
    cloneFileExplorerView(plugin: FolderNotesPlugin, ctx: MarkdownPostProcessorContext, root: HTMLElement, yaml: yamlSettings, pathBlacklist: string[]) {
        const folder = plugin.getEL(plugin.getFolderPathFromString(ctx.sourcePath))
        const folderElement = folder?.parentElement;
        const tFolder = plugin.app.vault.getAbstractFileByPath(plugin.getFolderPathFromString(ctx.sourcePath));
        console.log(folderElement)
        if (!folderElement) return;
        const newFolderElement = folderElement.cloneNode(true) as HTMLElement;
        newFolderElement.querySelectorAll('div.nav-folder-title ').forEach((el) => {
            const folder = plugin.app.vault.getAbstractFileByPath(el.getAttribute('data-path') || '');
            if (!(folder instanceof TFolder)) return;
            if (el.parentElement?.classList.contains('is-collapsed')) {
                folder.collapsed = true;
            } else {
                folder.collapsed = false;
            }
            if (el.classList.contains('has-folder-note')) {
                const folderNote = getFolderNote(plugin, folder.path);
                if (folderNote) { this.pathBlacklist.push(folderNote.path); }
            }
        });
        if (tFolder instanceof TFolder) {
            this.addFiles(tFolder.children, root);
        }
        newFolderElement.querySelectorAll('div.tree-item-icon').forEach((el) => {
            if (el instanceof HTMLElement) {
                el.onclick = () => {
                    const path = el.parentElement?.getAttribute('data-path');
                    if (!path) return;
                    const folder = plugin.app.vault.getAbstractFileByPath(path);
                    this.handleCollapseClick(el, plugin, yaml, pathBlacklist, folder);
                }
            }
        });
    }

    async addFiles(files: TAbstractFile[], childrenElement: HTMLElement) {
        const folders = files.filter((file) => file instanceof TFolder);
        const filesWithoutFolders = files.filter((file) => !(file instanceof TFolder));
        console.log(folders);
        console.log(filesWithoutFolders);
        for (const child of folders) {
            if (child instanceof TFolder) {
                const folderNote = getFolderNote(this.plugin, child.path);
                if (folderNote) { this.pathBlacklist.push(folderNote.path); }
                const excludedFolder = getExcludedFolder(this.plugin, child.path);
                if (excludedFolder?.excludeFromFolderOverview) { continue; }
                const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon right-triangle"><path d="M3 8L12 17L21 8"></path></svg>';
                const folderElement = childrenElement.createDiv({
                    cls: 'tree-item nav-folder',
                });
                const folderTitle = folderElement.createDiv({
                    cls: 'tree-item-self is-clickable nav-folder-title',
                    attr: {
                        'data-path': child.path,
                        'draggable': 'true'
                    },
                })
                if (!child.collapsed) {
                    folderTitle.classList.remove('is-collapsed');
                    const childrenElement = folderElement?.createDiv({ cls: 'tree-item-children nav-folder-children' });
                    console.log(folderElement);
                    console.log(child.children);
                    this.addFiles(child.children, childrenElement);
                } else {
                    folderTitle.classList.add('is-collapsed');
                }
                if (folderNote) { folderTitle.classList.add('has-folder-note') }
                const collapseIcon = folderTitle.createDiv({
                    cls: 'tree-item-icon collapse-icon nav-folder-collapse-indicator',
                });
                if (child.collapsed) {
                    collapseIcon.classList.add('is-collapsed');
                }
                collapseIcon.innerHTML = svg;
                collapseIcon.onclick = () => {
                    this.handleCollapseClick(collapseIcon, this.plugin, this.yaml, this.pathBlacklist, child);
                }
                folderTitle.createDiv({
                    cls: 'tree-item-inner nav-folder-title-content',
                    text: child.name,
                });
            }
        }
        for (const child of filesWithoutFolders) {
            if (child instanceof TFile) {
                if (this.pathBlacklist.includes(child.path)) { continue; }
                const extension = child.extension.toLowerCase() == 'md' ? 'markdown' : child.extension.toLowerCase();
                if (!this.yaml.includeTypes.includes(extension)) { continue; }
                const fileElement = childrenElement.createDiv({
                    cls: 'tree-item nav-file',
                });
                const fileTitle = fileElement.createDiv({
                    cls: 'tree-item-self is-clickable nav-file-title pointer-cursor',
                    attr: {
                        'data-path': child.path,
                        'draggable': 'true'
                    },
                })
                fileTitle.onclick = () => {
                    this.plugin.app.workspace.openLinkText(child.path, child.path, true);
                }
                fileTitle.createDiv({
                    cls: 'tree-item-inner nav-file-title-content',
                    text: child.basename,
                });
                if (child.extension !== 'md') {
                    fileTitle.createDiv({
                        cls: 'nav-file-tag',
                        text: child.extension
                    });
                }
            }
        }
    }

    handleCollapseClick(el: HTMLElement, plugin: FolderNotesPlugin, yaml: yamlSettings, pathBlacklist: string[], folder?: TFolder | undefined | null | TAbstractFile) {
        el.classList.toggle('is-collapsed');
        if (el.classList.contains('is-collapsed')) {
            if (!(folder instanceof TFolder)) return;
            folder.collapsed = true;
            el.parentElement?.parentElement?.childNodes[1]?.remove();
        } else {
            if (!(folder instanceof TFolder)) return;
            folder.collapsed = false;
            const folderElement = el.parentElement?.parentElement;
            if (!folderElement) return;
            const childrenElement = folderElement.createDiv({ cls: 'tree-item-children nav-folder-children' });
            let files = this.sortFiles(folder.children, this.yaml, plugin);
            files = this.filterFiles(files, plugin, folder.path, this.yaml.depth || 1, pathBlacklist);
            this.addFiles(files, childrenElement);
        }
    }


    goThroughFolders(plugin: FolderNotesPlugin, list: HTMLLIElement | HTMLUListElement, folder: TFolder,
        depth: number, sourceFolderPath: string, ctx: MarkdownPostProcessorContext, yaml: yamlSettings, pathBlacklist: string[], includeTypes: string[], disableFileTag: boolean) {
        if (sourceFolderPath === '') {
            depth--;
        }
        let files = this.filterFiles(folder.children, plugin, sourceFolderPath, depth, pathBlacklist);
        files = this.sortFiles(files, yaml, plugin);
        const ul = list.createEl('ul', { cls: 'folder-overview-list' });
        files.forEach((file) => {
            if (file instanceof TFolder) {
                const folderItem = this.addFolderList(plugin, ul, pathBlacklist, file);
                this.goThroughFolders(plugin, folderItem, file, depth, sourceFolderPath, ctx, yaml, pathBlacklist, includeTypes, disableFileTag);
            } else if (file instanceof TFile) {
                this.addFileList(plugin, ul, pathBlacklist, file, includeTypes, disableFileTag);
            }
        });
    }

    filterFiles(files: TAbstractFile[], plugin: FolderNotesPlugin, sourceFolderPath: string, depth: number, pathBlacklist: string[]) {
        return files.filter((file) => {
            if (pathBlacklist.includes(file.path)) { return false; }
            const folderPath = plugin.getFolderPathFromString(file.path);
            if (!folderPath.startsWith(sourceFolderPath)) { return false; }
            const excludedFolder = getExcludedFolder(plugin, file.path);
            if (excludedFolder?.excludeFromFolderOverview) { return false; }
            if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth) {
                return true;
            }
        });
    }

    sortFiles(files: TAbstractFile[], yaml: yamlSettings, plugin: FolderNotesPlugin) {
        if (!yaml?.sortBy) {
            yaml.sortBy = plugin.settings.defaultOverview.sortBy || 'name';
        }
        return files.sort((a, b) => {
            // sort by folder first
            if (a instanceof TFolder && !(b instanceof TFolder)) {
                return -1;
            }
            if (!(a instanceof TFolder) && b instanceof TFolder) {
                return 1;
            }
            if ((a instanceof TFolder) && (b instanceof TFolder)) {
                if (yaml.sortBy === 'name') {
                    if (a.name < b.name) {
                        return -1;
                    } else if (a.name > b.name) {
                        return 1;
                    }
                } else if (yaml.sortBy === 'nameAsc') {
                    if (a.name > b.name) {
                        return -1;
                    } else if (a.name < b.name) {
                        return 1;
                    }
                }
            }
            if (!(a instanceof TFile) || !(b instanceof TFile)) { return -1; }
            if (yaml.sortBy === 'created') {
                if (a.stat.ctime > b.stat.ctime) {
                    return -1;
                } else if (a.stat.ctime < b.stat.ctime) {
                    return 1;
                }
            } else if (yaml.sortBy === 'createdAsc') {
                if (a.stat.ctime < b.stat.ctime) {
                    return -1;
                } else if (a.stat.ctime > b.stat.ctime) {
                    return 1;
                }
            } else if (yaml.sortBy === 'modified') {
                if (a.stat.mtime > b.stat.mtime) {
                    return -1;
                } else if (a.stat.mtime < b.stat.mtime) {
                    return 1;
                }
            } else if (yaml.sortBy === 'modifiedAsc') {
                if (a.stat.mtime < b.stat.mtime) {
                    return -1;
                } else if (a.stat.mtime > b.stat.mtime) {
                    return 1;
                }
            }
            // sort by name
            if (a.name < b.name && yaml.sortBy === 'name') {
                return -1;
            } else if (a.name > b.name && yaml.sortBy === 'nameAsc') {
                return -1;
            }

            if (a.name > b.name && yaml.sortBy === 'name') {
                return 1;
            } else if (a.name < b.name && yaml.sortBy === 'nameAsc') {
                return 1;
            }
            return 0;
        });
    }

    removeEmptyFolders(ul: HTMLUListElement | HTMLLIElement, depth: number, yaml: yamlSettings) {
        const childrensToRemove: ChildNode[] = [];
        ul.childNodes.forEach((el) => {
            const childrens = (el as Element).querySelector('ul');
            if (!childrens || childrens === null) { return; }
            if (childrens && !childrens?.hasChildNodes() && !(el instanceof HTMLUListElement)) {
                childrensToRemove.push(el);
            } else if (el instanceof HTMLUListElement || el instanceof HTMLLIElement) {
                this.removeEmptyFolders(el, depth + 1, yaml);
            }
        });
        childrensToRemove.forEach((el) => {
            if (yaml.onlyIncludeSubfolders && depth === 1) { return; }
            el.remove();
        });
    }

    addFolderList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], folder: TFolder) {
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

    addFileList(plugin: FolderNotesPlugin, list: HTMLUListElement | HTMLLIElement, pathBlacklist: string[], file: TFile, includeTypes: string[], disableFileTag: boolean) {
        if (includeTypes.length > 0 && !includeTypes.includes('all')) {
            if (file.extension === 'md' && !includeTypes.includes('markdown')) return;
            if (file.extension === 'canvas' && !includeTypes.includes('canvas')) return;
            if (file.extension === 'pdf' && !includeTypes.includes('pdf')) return;
            const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
            if (imageTypes.includes(file.extension) && !includeTypes.includes('image')) return;
            const videoTypes = ['mp4', 'webm', 'ogv', 'mov', 'mkv'];
            if (videoTypes.includes(file.extension) && !includeTypes.includes('video')) return;
            const audioTypes = ['mp3', 'wav', 'm4a', '3gp', 'flac', 'ogg', 'oga', 'opus'];
            if (audioTypes.includes(file.extension) && includeTypes.includes('audio')) return;
            const allTypes = ['md', 'canvas', 'pdf', ...imageTypes, ...videoTypes, ...audioTypes];
            if (!allTypes.includes(file.extension) && !includeTypes.includes('other')) return;
        }
        if (pathBlacklist.includes(file.path)) return;
        const listItem = list.createEl('li', { cls: 'folder-overview-list file-link' });
        const nameItem = listItem.createEl('div', { cls: 'folder-overview-list-item' });
        const link = nameItem.createEl('a', { cls: 'internal-link', href: file.path });
        link.innerText = file.basename;
        if (file.extension !== 'md' && !disableFileTag) {
            nameItem.createDiv({ cls: 'nav-file-tag' }).innerText = file.extension;
        }
    }

    getAllFiles(files: TAbstractFile[], sourceFolderPath: string, depth: number) {
        const allFiles: TAbstractFile[] = [];
        files.forEach((file) => {
            if (file instanceof TFolder) {
                if ((file.path.split('/').length - sourceFolderPath.split('/').length) - 1 < depth - 1) {
                    allFiles.push(...this.getAllFiles(file.children, sourceFolderPath, depth));
                }
            } else {
                allFiles.push(file);
            }
        });
        return allFiles;
    }
}