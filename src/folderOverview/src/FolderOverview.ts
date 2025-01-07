import { MarkdownPostProcessorContext, parseYaml, TAbstractFile, TFolder, TFile, stringifyYaml, Notice, Menu, MarkdownRenderChild, Plugin, App, } from 'obsidian';
import { getFolderNote } from '../../functions/folderNoteFunctions';
import { FolderOverviewSettings } from './modals/Settings';
import { getExcludedFolder } from '../../ExcludeFolders/functions/folderFunctions';
import { getFolderPathFromString } from '../../functions/utils';
import { getEl } from '../../functions/styleFunctions';
import { FileExplorerOverview } from './FileExplorer';
import { renderListOverview } from './ListStyle';
import NewFolderNameModal from '../../modals/NewFolderName';
import { CustomEventEmitter } from './utils/EventEmitter';
import FolderOverviewPlugin from 'src/main';
import FolderNotesPlugin from '../../main';

export type includeTypes = 'folder' | 'markdown' | 'canvas' | 'other' | 'pdf' | 'image' | 'audio' | 'video' | 'all';

export type overviewSettings = {
    id: string;
    folderPath: string;
    title: string;
    showTitle: boolean;
    depth: number;
    includeTypes: includeTypes[];
    style: 'list' | 'grid' | 'explorer';
    disableFileTag: boolean;
    sortBy: 'name' | 'created' | 'modified';
    sortByAsc: boolean;
    showEmptyFolders: boolean;
    onlyIncludeSubfolders: boolean;
    storeFolderCondition: boolean;
    showFolderNotes: boolean;
    disableCollapseIcon: boolean;
    alwaysCollapse: boolean;
};

export class FolderOverview {
    emitter: CustomEventEmitter;
    yaml: overviewSettings;
    plugin: FolderOverviewPlugin | FolderNotesPlugin;
    ctx: MarkdownPostProcessorContext;
    source: string;
    folderName: string | null;
    el: HTMLElement;
    pathBlacklist: string[] = [];
    folders: TFolder[] = [];
    sourceFilePath: string;
    sourceFolder: TFolder | undefined;
    root: HTMLElement;
    listEl: HTMLUListElement;
    defaultSettings: overviewSettings;

    eventListeners: (() => void)[] = [];
    constructor(plugin: FolderNotesPlugin | FolderOverviewPlugin, ctx: MarkdownPostProcessorContext, source: string, el: HTMLElement, defaultSettings: overviewSettings) {
        console.log('creating folder overview');
        console.log('defaultSettings', defaultSettings);
        this.plugin = plugin;
        this.emitter = new CustomEventEmitter();
        let yaml: overviewSettings = parseYaml(source);
        if (!yaml) { yaml = {} as overviewSettings; }
        console.log('yaml', yaml);
        const includeTypes = yaml?.includeTypes || defaultSettings.includeTypes || ['folder', 'markdown'];
        this.ctx = ctx;
        this.source = source;
        this.el = el;
        this.sourceFilePath = this.ctx.sourcePath;
        this.sourceFolder = this.plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(ctx.sourcePath)) as TFolder;
        this.defaultSettings = defaultSettings;
        this.yaml = {
            id: yaml?.id ?? crypto.randomUUID(),
            folderPath: yaml?.folderPath ?? getFolderPathFromString(ctx.sourcePath),
            title: yaml?.title ?? defaultSettings.title,
            showTitle: yaml?.showTitle ?? defaultSettings.showTitle,
            depth: yaml?.depth ?? defaultSettings.depth,
            style: yaml?.style ?? 'list',
            includeTypes: includeTypes.map((type) => type.toLowerCase()) as includeTypes[],
            disableFileTag: yaml?.disableFileTag ?? defaultSettings.disableFileTag,
            sortBy: yaml?.sortBy ?? defaultSettings.sortBy,
            sortByAsc: yaml?.sortByAsc ?? defaultSettings.sortByAsc,
            showEmptyFolders: yaml?.showEmptyFolders ?? defaultSettings.showEmptyFolders,
            onlyIncludeSubfolders: yaml?.onlyIncludeSubfolders ?? defaultSettings.onlyIncludeSubfolders,
            storeFolderCondition: yaml?.storeFolderCondition ?? defaultSettings.storeFolderCondition,
            showFolderNotes: yaml?.showFolderNotes ?? defaultSettings.showFolderNotes,
            disableCollapseIcon: yaml?.disableCollapseIcon ?? defaultSettings.disableCollapseIcon,
            alwaysCollapse: yaml?.alwaysCollapse ?? defaultSettings.alwaysCollapse,
        };
        console.log('this.yaml', this.yaml);


        const customChild = new CustomMarkdownRenderChild(el, this);
        ctx.addChild(customChild);
    }

    on(event: string, listener: (data?: any) => void) {
        this.emitter.on(event, listener);
    }

    off(event: string, listener: (data?: any) => void) {
        this.emitter.off(event, listener);
    }

    private emit(event: string, data?: any) {
        this.emitter.emit(event, data);
    }

    handleVaultChange(eventType: string) {
        this.emit(`vault-change`, eventType);
    }

    disconnectListeners() {
        this.eventListeners.forEach(unregister => unregister());
        this.eventListeners = [];
    }

    registerListeners() {
        const plugin = this.plugin;
        const handleRename = () => this.handleVaultChange('renamed');
        const handleCreate = () => this.handleVaultChange('created');
        const handleDelete = () => this.handleVaultChange('deleted');

        plugin.app.vault.on('rename', handleRename);
        plugin.app.vault.on('create', handleCreate);
        plugin.app.vault.on('delete', handleDelete);

        this.eventListeners.push(() => plugin.app.vault.off('rename', handleRename));
        this.eventListeners.push(() => plugin.app.vault.off('create', handleCreate));
        this.eventListeners.push(() => plugin.app.vault.off('delete', handleDelete));
    }

    async create(plugin: FolderOverviewPlugin | FolderNotesPlugin, source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        el.empty();
        el.parentElement?.classList.add('folder-overview-container');

        const root = el.createEl('div', { cls: 'folder-overview' });
        this.root = root;

        const titleEl = root.createEl('h1', { cls: 'folder-overview-title' });

        const ul = root.createEl('ul', { cls: 'folder-overview-list' });
        this.listEl = ul;

        if (this.yaml.includeTypes.length === 0) { return this.addEditButton(root); }
        let files: TAbstractFile[] = [];

        const sourceFile = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
        if (!sourceFile) return;

        let sourceFolderPath = this.yaml.folderPath || getFolderPathFromString(ctx.sourcePath);
        if (!ctx.sourcePath.includes('/')) {
            sourceFolderPath = '/';
        }

        this.registerListeners();

        let sourceFolder;

        if (sourceFolderPath !== '/') {
            if (this.yaml.folderPath === '') {
                sourceFolder = plugin.app.vault.getAbstractFileByPath(getFolderPathFromString(ctx.sourcePath));
            } else {
                sourceFolder = plugin.app.vault.getAbstractFileByPath(this.yaml.folderPath);
            }
        }

        if (this.yaml.showTitle) {
            if (sourceFolder && sourceFolderPath !== '/') {
                titleEl.innerText = this.yaml.title.replace('{{folderName}}', sourceFolder.name);
            } else if (sourceFolderPath == '/') {
                titleEl.innerText = this.yaml.title.replace('{{folderName}}', 'Vault');
            } else {
                titleEl.innerText = this.yaml.title.replace('{{folderName}}', '');
            }
        }

        if (!sourceFolder && (sourceFolderPath !== '/' && sourceFolderPath !== '')) { return new Notice('Folder overview: Couldn\'t find the folder'); }
        if (!sourceFolder && sourceFolderPath == '') {
            sourceFolderPath = '/';
        }
        if (!(sourceFolder instanceof TFolder)) { return; }

        if (sourceFolderPath == '/') {
            const rootFiles: TAbstractFile[] = [];
            plugin.app.vault.getAllLoadedFiles().filter(f => f.parent?.path === '/').forEach((file) => {
                if (!file.path.includes('/')) {
                    rootFiles.push(file);
                }
            });
            files = rootFiles;
        } else if (sourceFolder) {
            files = sourceFolder.children;
        }


        files = await this.filterFiles(files, plugin, sourceFolderPath, this.yaml.depth, this.pathBlacklist);

        if (!this.yaml.includeTypes.includes('folder')) {
            files = this.getAllFiles(files, sourceFolderPath, this.yaml.depth);
        }

        if (files.length === 0) {
            return this.addEditButton(root)
        }

        files = this.sortFiles(files);

        if (this.yaml.style === 'grid') {
            const grid = root.createEl('div', { cls: 'folder-overview-grid' });
            files.forEach(async (file) => {
                const gridItem = grid.createEl('div', { cls: 'folder-overview-grid-item' });
                const gridArticle = gridItem.createEl('article', { cls: 'folder-overview-grid-item-article' });
                if (file instanceof TFile) {
                    const fileContent = await plugin.app.vault.read(file);
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
            renderListOverview(plugin, ctx, root, this.yaml, this.pathBlacklist, this);
        } else if (this.yaml.style === 'explorer') {
            const fileExplorerOverview = new FileExplorerOverview(plugin, ctx, root, this.yaml, this.pathBlacklist, this);
            if (this.plugin.app.workspace.layoutReady) {
                await fileExplorerOverview.renderFileExplorer();
            } else {
                this.plugin.app.workspace.onLayoutReady(() => {
                    fileExplorerOverview.renderFileExplorer();
                });
            }
        }

        const overviewListEl = el.childNodes[0].childNodes[1];
        if (overviewListEl && overviewListEl.childNodes.length === 0) {
            if (this.yaml.style === 'explorer') {
                const overview = el.childNodes[0];
                if (!overview.childNodes[2]) {
                    if (this.plugin.app.workspace.layoutReady) {
                        return this.addEditButton(root);
                    }
                }
            } else {
                if (this.plugin.app.workspace.layoutReady) {
                    return this.addEditButton(root);
                }
            }
        }
        if (this.yaml.includeTypes.length > 1 && (!this.yaml.showEmptyFolders || this.yaml.onlyIncludeSubfolders) && this.yaml.style === 'list') {
            this.removeEmptyFolders(ul, 1, this.yaml);
        }
    }

    addEditButton(root: HTMLElement) {
        console.log('adding edit button');
        const editButton = root.createEl('button', { cls: 'folder-overview-edit-button' });
        editButton.innerText = 'Edit overview';
        editButton.addEventListener('click', (e) => {
            e.stopImmediatePropagation();
            e.preventDefault();
            e.stopPropagation();
            console.log({ 'this.plugin': this.plugin, 'this.yaml': this.yaml, 'this.ctx': this.ctx, 'this.el': this.el });
            new FolderOverviewSettings(this.plugin.app as App, this.plugin, this.yaml, this.ctx, this.el, this.plugin.settings as overviewSettings).open();
        }, { capture: true });
    }

    async filterFiles(files: TAbstractFile[], plugin: FolderOverviewPlugin | FolderNotesPlugin, sourceFolderPath: string, depth: number, pathBlacklist: string[]) {
        const filteredFiles = await Promise.all(files.map(async (file) => {
            const folderPath = getFolderPathFromString(file.path);
            const isBlacklisted = pathBlacklist.includes(file.path);
            const isSubfolder = folderPath.startsWith(sourceFolderPath) && sourceFolderPath !== '/';
            const isSourceFile = file.path === this.sourceFilePath;
            let isExcludedFromOverview = false;
            if (plugin instanceof FolderNotesPlugin) {
                isExcludedFromOverview = (await getExcludedFolder(plugin, file.path, true))?.excludeFromFolderOverview ?? false;
            }

            if ((isBlacklisted && !this.yaml.showFolderNotes) || !isSubfolder || isSourceFile || isExcludedFromOverview) {
                return null;
            }

            const fileDepth = file.path.split('/').length - sourceFolderPath.split('/').length;
            return fileDepth <= depth ? file : null;
        }));

        return filteredFiles.filter(file => file !== null);
    }


    sortFiles(files: TAbstractFile[]): TAbstractFile[] {
        const yaml = this.yaml;

        if (!yaml?.sortBy) {
            yaml.sortBy = this.defaultSettings.sortBy ?? 'name';
            yaml.sortByAsc = this.defaultSettings.sortByAsc ?? false;
        }

        files.sort((a, b) => {
            if (a instanceof TFolder && !(b instanceof TFolder)) {
                return -1;
            }
            if (!(a instanceof TFolder) && b instanceof TFolder) {
                return 1;
            }

            if (a instanceof TFolder && b instanceof TFolder) {
                return yaml.sortByAsc
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }

            if (a instanceof TFile && b instanceof TFile) {
                if (yaml.sortBy === 'created') {
                    return yaml.sortByAsc ? a.stat.ctime - b.stat.ctime : b.stat.ctime - a.stat.ctime;
                } else if (yaml.sortBy === 'modified') {
                    return yaml.sortByAsc ? a.stat.mtime - b.stat.mtime : b.stat.mtime - a.stat.mtime;
                } else if (yaml.sortBy === 'name') {
                    return yaml.sortByAsc
                        ? a.basename.localeCompare(b.basename)
                        : b.basename.localeCompare(a.basename);
                }
            }

            return 0;
        });

        return files;
    }

    removeEmptyFolders(ul: HTMLUListElement | HTMLLIElement, depth: number, yaml: overviewSettings) {
        const childrensToRemove: ChildNode[] = [];
        ul.childNodes.forEach((el) => {
            if ((el.childNodes[0] as HTMLElement)?.classList && (el.childNodes[0] as HTMLElement)?.classList.contains('internal-link')) { return; }
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

    getAllFiles(files: TAbstractFile[], sourceFolderPath: string, depth: number) {
        const allFiles: TAbstractFile[] = [];

        const getDepth = (filePath: string) => {
            return filePath.split('/').length - sourceFolderPath.split('/').length;
        };

        files.forEach((file) => {
            const fileDepth = getDepth(file.path);

            if (file instanceof TFolder) {
                if (fileDepth < depth) {
                    allFiles.push(...this.getAllFiles(file.children, sourceFolderPath, depth));
                }
            } else {
                allFiles.push(file);
            }
        });

        return allFiles;
    }

    fileMenu(file: TFile, e: MouseEvent) {
        const plugin = this.plugin;
        const fileMenu = new Menu();
        fileMenu.addSeparator();

        fileMenu.addItem((item) => {
            item.setTitle(window.i18next.t('plugins.file-explorer.menu-opt-rename'));
            item.setIcon('pencil');
            item.onClick(async () => {
                plugin.app.fileManager.promptForFileRename(file)
            });
        });

        fileMenu.addItem((item) => {
            item.setTitle(window.i18next.t('plugins.file-explorer.menu-opt-delete'));
            item.setIcon('trash');
            item.dom.addClass('is-warning');
            item.dom.setAttribute('data-section', 'danger')
            item.onClick(() => {
                plugin.app.fileManager.promptForDeletion(file)
            });
        });

        fileMenu.addSeparator();

        plugin.app.workspace.trigger('file-menu', fileMenu, file, 'folder-overview-file-context-menu', null);
        fileMenu.showAtPosition({ x: e.pageX, y: e.pageY });
    }

    folderMenu(folder: TFolder, e: MouseEvent) {
        const plugin = this.plugin;
        const folderMenu = new Menu();
        folderMenu.addSeparator();

        folderMenu.addItem((item) => {
            item.setTitle('Rename');
            item.setIcon('pencil');
            item.onClick(async () => {
                if (plugin instanceof FolderNotesPlugin) {
                    new NewFolderNameModal(plugin.app, plugin, folder).open();
                }
            });
        });

        folderMenu.addItem((item) => {
            item.setTitle('Delete');
            item.setIcon('trash');
            item.dom.addClass('is-warning');
            item.dom.setAttribute('data-section', 'danger')
            item.onClick(() => {
                plugin.app.fileManager.promptForFolderDeletion(folder)
            });
        });

        folderMenu.addSeparator();

        plugin.app.workspace.trigger('file-menu', folderMenu, folder, 'folder-overview-folder-context-menu', null);
        folderMenu.showAtPosition({ x: e.pageX, y: e.pageY });
    }

    getElFromOverview(path: string): HTMLElement | null {
        const el = this.listEl.querySelector(`[data-path='${CSS.escape(path)}']`) as HTMLElement | null;
        return el;
    }


}

export async function updateYaml(plugin: FolderOverviewPlugin | FolderNotesPlugin, ctx: MarkdownPostProcessorContext, el: HTMLElement, yaml: overviewSettings) {
    const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
    if (!(file instanceof TFile)) return;
    let stringYaml = stringifyYaml(yaml);
    await plugin.app.vault.process(file, (text) => {
        const info = ctx.getSectionInfo(el);
        // check if stringYaml ends with a newline
        if (stringYaml[stringYaml.length - 1] !== '\n') {
            stringYaml += '\n';
        }
        if (info) {
            const { lineStart } = info;
            const lineEnd = getCodeBlockEndLine(text, lineStart);
            if (lineEnd === -1 || !lineEnd) return text;
            const lineLength = lineEnd - lineStart;
            const lines = text.split('\n');
            lines.splice(lineStart, lineLength + 1, `\`\`\`folder-overview\n${stringYaml}\`\`\``);
            return lines.join('\n');
        }
        return `\`\`\`folder-overview\n${stringYaml}\`\`\``;
    });
}

export function getCodeBlockEndLine(text: string, startLine: number, count = 1) {
    let line = startLine + 1;
    const lines = text.split('\n');
    while (line < lines.length) {
        if (count > 50) { return -1; }
        if (lines[line].startsWith('```')) {
            return line;
        }
        line++;
        count++;
    }
    return line;
}

export async function getOverviews(plugin: FolderOverviewPlugin | FolderNotesPlugin, file: TFile | null) {
    // is an object with unkown keys
    if (!file) return [];
    const overviews: { [key: string]: string }[] = [];
    const content = await plugin.app.vault.read(file);
    if (!content) return overviews;

    const yamlBlocks = content.match(/```folder-overview\n([\s\S]*?)```/g);
    if (!yamlBlocks) return overviews;
    for (const block of yamlBlocks) {
        const yaml = parseYaml(block.replace('```folder-overview\n', '').replace('```', ''));
        if (!yaml) continue;
        overviews.push(yaml);
    }

    return overviews;
}

export async function updateYamlById(plugin: FolderOverviewPlugin | FolderNotesPlugin, overviewId: string, file: TFile, newYaml: overviewSettings) {
    plugin.app.vault.process(file, (text) => {
        const yamlBlocks = text.match(/```folder-overview\n([\s\S]*?)```/g);
        if (!yamlBlocks) return text;
        for (const block of yamlBlocks) {
            const yaml = parseYaml(block.replace('```folder-overview\n', '').replace('```', ''));
            if (!yaml) continue;
            if (yaml.id === overviewId) {
                const stringYaml = stringifyYaml(newYaml);
                const newBlock = `\`\`\`folder-overview\n${stringYaml}\`\`\``;
                text = text.replace(block, newBlock);
            }
        }
        return text;
    });

}

export function parseOverviewTitle(overview: overviewSettings, plugin: FolderOverviewPlugin | FolderNotesPlugin, folder: TFolder | null) {
    const sourceFolderPath = overview.folderPath;
    let sourceFolder: TFolder | undefined | null;
    let title = overview.title;

    if (sourceFolderPath !== '/') {
        if (sourceFolderPath === '') {
            sourceFolder = folder;
        } else {
            sourceFolder = plugin.app.vault.getAbstractFileByPath(sourceFolderPath) as TFolder;
        }
    }

    if (sourceFolder && sourceFolderPath !== '/') {
        title = title.replace('{{folderName}}', sourceFolder.name);
    } else if (sourceFolderPath == '/') {
        title = title.replace('{{folderName}}', 'Vault');
    } else {
        title = title.replace('{{folderName}}', '');
    }

    return title;
}


class CustomMarkdownRenderChild extends MarkdownRenderChild {
    folderOverview: FolderOverview;
    constructor(el: HTMLElement, folderOverview: FolderOverview) {
        super(el);
        this.folderOverview = folderOverview;
    }

    onunload() {
        this.folderOverview.disconnectListeners();
    }
}
