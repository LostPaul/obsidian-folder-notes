/* eslint-disable max-len */
import {
	Platform, SettingPage,
	type Setting, type SettingDefinitionItem, type SettingGroupItem,
	type SettingDefinitionList, type SettingDefinitionPage,
} from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import { ListComponent } from '../functions/ListComponent';
import AddSupportedFileModal from '../modals/AddSupportedFileType';
import { FrontMatterTitlePluginHandler } from '../events/FrontMatterTitle';
import ConfirmationModal from './modals/CreateFnForEveryFolder';
import { TemplateSuggest } from '../suggesters/TemplateSuggester';
import { refreshAllFolderStyles } from '../functions/styleFunctions';
import BackupWarningModal from './modals/BackupWarning';
import RenameFolderNotesModal from './modals/RenameFns';
import { FolderSuggest } from '../suggesters/FolderSuggester';
import { ExcludedFolder } from 'src/ExcludeFolders/ExcludeFolder';
import { ExcludePattern } from 'src/ExcludeFolders/ExcludePattern';
import {
	addExcludedFolder, deleteExcludedFolder, updateExcludedFolder,
} from 'src/ExcludeFolders/functions/folderFunctions';
import { deletePattern, updatePattern } from 'src/ExcludeFolders/functions/patternFunctions';
import ExcludedFolderSettings from 'src/ExcludeFolders/modals/ExcludeFolderSettings';
import PatternSettings from 'src/ExcludeFolders/modals/PatternSettings';
import WhitelistedFoldersSettings from 'src/ExcludeFolders/modals/WhitelistedFoldersSettings';
import { renderOverviewDefaults } from './FolderOverviewSettings';

const MAX_FILE_EXPLORER_REVEAL_MARGIN = 10;

type SettingEffect = (tab: SettingsTab, value: unknown) => void;

function bodyClass(cls: string, invert = false): SettingEffect {
	return (_tab, value) => activeDocument.body.classList.toggle(cls, invert ? !value : !!value);
}

function updateFmtpFileNames(tab: SettingsTab): void {
	tab.plugin.app.vault.getFiles().forEach((file) => {
		void tab.plugin.fmtpHandler?.fmptUpdateFileName(
			{ id: '', result: false, path: file.path, pathOnly: false },
			false,
		);
	});
}

export const SETTING_EFFECTS: Record<string, SettingEffect> = {
	'tabManagerEnabled': (tab, value) => {
		if (value) {
			tab.plugin.tabManager.updateTabs();
		} else {
			tab.plugin.tabManager.resetTabs();
		}
	},
	'storageLocation': (tab) => refreshAllFolderStyles(undefined, tab.plugin),
	'hideFolderNote': bodyClass('hide-folder-note'),
	'!stopWhitespaceCollapsing': bodyClass('fn-whitespace-stop-collapsing', true),
	'highlightFolder': bodyClass('disable-folder-highlight', true),
	'hideCollapsingIcon': bodyClass('fn-hide-collapse-icon'),
	'hideCollapsingIconForEmptyFolders': bodyClass('fn-hide-empty-collapse-icon'),
	'ignoreAttachmentFolder': bodyClass('fn-ignore-attachment-folder'),
	'underlineFolder': bodyClass('folder-note-underline'),
	'boldName': bodyClass('folder-note-bold'),
	'cursiveName': bodyClass('folder-note-cursive'),
	'underlineFolderInPath': bodyClass('folder-note-underline-path'),
	'boldNameInPath': bodyClass('folder-note-bold-path'),
	'cursiveNameInPath': bodyClass('folder-note-cursive-path'),
	'hideFolderNoteNameInPath': bodyClass('folder-note-hide-name-path'),
	'frontMatterTitle.enabled': (tab, value) => {
		const { plugin } = tab;
		if (!value) {
			if (plugin.fmtpHandler) {
				plugin.updateAllBreadcrumbs(true);
			}
			updateFmtpFileNames(tab);
			plugin.fmtpHandler?.deleteEvent();
		}
		plugin.fmtpHandler = new FrontMatterTitlePluginHandler(plugin);
	},
	'frontMatterTitle.explorer': (tab) => updateFmtpFileNames(tab),
	'frontMatterTitle.path': (tab, value) => tab.plugin.updateAllBreadcrumbs(!value),
	'fvGlobalSettings.autoUpdateLinks': (tab, value) => {
		if (value) {
			tab.plugin.fvIndexDB.init(true);
		} else {
			tab.plugin.fvIndexDB.active = false;
		}
	},
};

function restartDesc(desc: string): DocumentFragment {
	return createFragment((frag) => {
		frag.appendText(`${desc} `);
		frag.createSpan({ cls: 'fn-restart-note', text: 'Requires a restart to take effect.' });
	});
}

function toggle(name: string, key: string, desc?: string | DocumentFragment, extra: Partial<SettingGroupItem> = {}): SettingGroupItem {
	return { name, desc, control: { type: 'toggle', key }, ...extra } as SettingGroupItem;
}

export function normalizeFolderNoteType(tab: SettingsTab): void {
	const { settings } = tab.plugin;
	const supported = (type: string): boolean => settings.supportedFileTypes.includes(type.replace('.', ''));
	let type = settings.folderNoteType.startsWith('.') ? settings.folderNoteType : `.${settings.folderNoteType}`;
	if (type !== '.ask' && !supported(type)) type = '.md';
	if (type !== '.ask' && !supported(type)) type = '.ask';
	if (type !== settings.folderNoteType) {
		settings.folderNoteType = type;
		void tab.plugin.saveSettings();
	}
}

function fileTypeOptions(tab: SettingsTab): Record<string, string> {
	const options: Record<string, string> = { '.ask': 'Ask for file type' };
	tab.plugin.settings.supportedFileTypes.forEach((type) => {
		if (type === 'md' || type === '.md') {
			options['.md'] = 'Markdown';
		} else {
			options[`.${type}`] = type;
		}
	});
	return options;
}

function renderFolderNoteName(tab: SettingsTab, setting: Setting): void {
	const { plugin } = tab;
	setting
		.addText((text) => text
			.setValue(plugin.settings.folderNoteName)
			.onChange(async (value) => {
				if (value.trim() === '') return;
				plugin.settings.folderNoteName = value;
				await tab.save();
				tab.refreshDomState();
			}))
		.addButton((button) => button
			.setButtonText('Rename existing folder notes')
			.setCta()
			.onClick(() => {
				new RenameFolderNotesModal(
					plugin,
					'Rename all existing folder notes',
					'When you click on "Confirm" all existing folder notes will be renamed to the new folder note name.',
					tab.renameFolderNotes,
					[plugin.settings.oldFolderNoteName ?? '{{folder_name}}'],
				).open();
			}));
}

function renderSupportedFileTypes(tab: SettingsTab, setting: Setting): void {
	const { plugin } = tab;
	const list = new ListComponent(setting.settingEl, plugin.settings.supportedFileTypes || [], ['md', 'canvas']);
	list.on('update', (values: unknown) => {
		plugin.settings.supportedFileTypes = values as string[];
		normalizeFolderNoteType(tab);
		void tab.save();
		tab.refresh();
	});
	const openCustomModal = (): void => new AddSupportedFileModal(tab.app, plugin, tab, list).open();
	const options: Record<string, string> = {
		md: 'Markdown', canvas: 'Canvas', base: 'Bases', excalidraw: 'Excalidraw',
	};
	const missing = Object.keys(options).filter((type) => !plugin.settings.supportedFileTypes.includes(type));
	if (missing.length === 0) {
		setting.addButton((button) => button
			.setButtonText('Add custom file type')
			.setCta()
			.onClick(openCustomModal));
		return;
	}
	setting.addDropdown((dropdown) => {
		missing.forEach((type) => dropdown.addOption(type, options[type]));
		dropdown.addOption('custom', 'Custom extension');
		dropdown.addOption('+', '+');
		dropdown.setValue('+');
		dropdown.onChange(async (value) => {
			if (value === 'custom') return openCustomModal();
			await list.addValue(value.toLowerCase());
		});
	});
}

function renderTemplatePath(tab: SettingsTab, setting: Setting): void {
	const { plugin } = tab;
	setting.addSearch((cb) => {
		new TemplateSuggest(cb.inputEl, plugin);
		cb.setPlaceholder('Template path');
		const templateFile = plugin.app.vault.getAbstractFileByPath(plugin.settings.templatePath);
		cb.setValue(templateFile?.name.replace('.md', '') || '');
		cb.onChange(async (value) => {
			if (value.trim() !== '') return;
			plugin.settings.templatePath = '';
			await tab.save();
		});
	});
}

function renderStorageLocation(tab: SettingsTab, setting: Setting): void {
	const { plugin } = tab;
	setting
		.addDropdown((dropdown) => dropdown
			.addOption('insideFolder', 'Inside the folder')
			.addOption('parentFolder', 'In the parent folder')
			.setValue(plugin.settings.storageLocation)
			.onChange(async (value) => {
				await tab.setControlValue('storageLocation', value);
			}))
		.addButton((button) => button
			.setButtonText('Switch')
			.setCta()
			.onClick(() => {
				const current = plugin.settings.storageLocation;
				const oldStorageLocation = current === 'parentFolder' ? 'insideFolder' : 'parentFolder';
				new BackupWarningModal(
					plugin,
					'Switch storage location',
					'When you click on "Confirm" all folder notes will be moved to the new storage location.',
					tab.switchStorageLocation,
					[oldStorageLocation],
				).open();
			}));
}

function folderNotesPage(tab: SettingsTab): SettingDefinitionPage {
	const { settings } = tab.plugin;
	return {
		type: 'page',
		name: 'Folder notes',
		desc: 'Name template, file types, template, and storage location.',
		items: [
			{
				type: 'group',
				heading: 'Naming',
				items: [
					{
						name: 'Folder note name template',
						desc: restartDesc('All folder notes will use this name. Use {{folder_name}} to insert the folder’s name. Existing notes won’t update automatically; click on the button to apply the new name.'),
						aliases: ['rename'],
						render: (setting) => renderFolderNoteName(tab, setting),
					},
					toggle(
						'Display folder name in tab title',
						'tabManagerEnabled',
						'Use the actual folder name in the tab title instead of the custom folder note name (e.g., "folder note").',
						{ visible: () => !settings.folderNoteName.includes('{{folder_name}}') },
					),
				],
			},
			{
				type: 'group',
				heading: 'File types',
				items: [
					{
						name: 'Default file type for new folder notes',
						desc: 'Choose the default file type (canvas, Markdown, ...) used when creating new folder notes.',
						control: { type: 'dropdown', key: 'folderNoteType', options: fileTypeOptions(tab) },
					},
					{
						name: 'Supported file types',
						desc: 'Specify which file types are allowed as folder notes. Applies to both new and existing folders. Adding many types may affect performance.',
						aliases: ['extensions', 'canvas', 'excalidraw', 'bases'],
						render: (setting) => renderSupportedFileTypes(tab, setting),
					},
				],
			},
			{
				type: 'group',
				heading: 'Template',
				items: [
					{
						name: 'Template path',
						desc: restartDesc('Can be used with templater/templates plugin. If you add the location of the templates there.'),
						aliases: ['templater'],
						render: (setting) => renderTemplatePath(tab, setting),
					},
				],
			},
			{
				type: 'group',
				heading: 'Storage',
				items: [
					{
						name: 'Storage location',
						desc: restartDesc('Choose where to store the folder notes.'),
						render: (setting) => renderStorageLocation(tab, setting),
					},
					toggle('Delete folder notes when deleting the folder', 'syncDelete',
						'Delete the folder note when deleting the folder',
						{ visible: () => settings.storageLocation === 'parentFolder' }),
					toggle('Move folder notes when moving the folder', 'syncMove',
						'Move the folder note file along with the folder when it is moved',
						{ visible: () => settings.storageLocation === 'parentFolder' }),
				],
			},
		],
	};
}

function behaviorPage(tab: SettingsTab): SettingDefinitionPage {
	const { settings } = tab.plugin;
	const ctrl = Platform.isMacOS ? 'Cmd + Click' : 'Ctrl + Click';
	const alt = Platform.isMacOS ? 'Option + Click' : 'Alt + Click';
	return {
		type: 'page',
		name: 'Behavior',
		desc: 'Keyboard shortcuts, opening, deletion, and folder name sync.',
		items: [
			{
				type: 'group',
				heading: 'Keyboard shortcuts',
				visible: Platform.isDesktopApp,
				items: [
					{
						name: 'Key for creating folder note',
						desc: 'The key combination to create a folder note',
						control: { type: 'dropdown', key: 'createKey', options: { ctrl, alt } },
					},
					{
						name: 'Key for opening folder note',
						desc: 'Select the combination to open a folder note',
						control: { type: 'dropdown', key: 'openKey', options: { click: 'Mouse click', ctrl, alt } },
					},
				],
			},
			{
				type: 'group',
				heading: 'Opening',
				items: [
					toggle('Open folder note in a new tab by default', 'openInNewTab',
						restartDesc('Always open folder notes in a new tab unless the note is already open in the current tab.'),
						{ visible: Platform.isDesktop }),
					toggle('Focus existing tab instead of creating a new one', 'focusExistingTab',
						'If a folder note is already open in a tab, focus that tab instead of creating a new one.',
						{ visible: () => settings.openInNewTab }),
				],
			},
			{
				type: 'group',
				heading: 'Deletion',
				items: [
					toggle('Confirm folder note deletion', 'showDeleteConfirmation', 'Ask for confirmation before deleting a folder note'),
					{
						name: 'Deleted folder notes',
						desc: 'What happens to the folder note after you delete it',
						control: {
							type: 'dropdown',
							key: 'deleteFilesAction',
							options: {
								trash: 'Move to system trash',
								obsidianTrash: 'Move to Obsidian trash (.trash folder)',
								delete: 'Delete permanently',
							},
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Sync',
				items: [
					toggle('Sync folder name', 'syncFolderName', 'Automatically rename the folder note when the folder name is changed'),
				],
			},
		],
	};
}

function automationPage(tab: SettingsTab): SettingDefinitionPage {
	const { settings } = tab.plugin;
	return {
		type: 'page',
		name: 'Automation',
		desc: 'Create folder notes for every folder and auto-create rules.',
		items: [
			{
				type: 'group',
				items: [
					{
						name: 'Create folder notes for all folders',
						desc: 'Generate folder notes for every folder in the vault.',
						action: () => new ConfirmationModal(tab.app, tab.plugin).open(),
					},
					toggle('Auto-create on folder creation', 'autoCreate', 'Automatically create a folder note whenever a new folder is added.'),
					toggle('Auto-open after creation', 'autoCreateFocusFiles',
						'Open the folder note immediately after it’s created automatically.',
						{ visible: () => settings.autoCreate }),
					toggle('Auto-create for attachment folders', 'autoCreateForAttachmentFolder',
						'Also automatically create folder notes for attachment folders (e.g., "attachments", "media", etc.).',
						{ visible: () => settings.autoCreate }),
					toggle('Auto-create when creating notes', 'autoCreateForFiles',
						'Automatically create a folder note when a regular note is created inside a folder. Works for supported file types only.'),
				],
			},
		],
	};
}

function fileExplorerPage(tab: SettingsTab): SettingDefinitionPage {
	const { settings } = tab.plugin;
	return {
		type: 'page',
		name: 'File explorer',
		desc: 'Hiding folder notes, click behavior, collapse icons, and styling.',
		items: [
			{
				type: 'group',
				heading: 'Behavior',
				items: [
					toggle('Hide folder note', 'hideFolderNote', 'Hide the folder note file from appearing in the file explorer'),
					toggle('Disable click-to-open folder note on mobile', 'disableOpenFolderNoteOnClick',
						restartDesc('Prevents folder notes from opening when tapping the folder name or surrounding area on mobile devices. They can now only be opened via the context menu or a command.')),
					toggle('Open folder notes by only clicking directly on the folder name', '!stopWhitespaceCollapsing',
						'Only allow folder notes to open when clicking directly on the folder name in the file explorer'),
					toggle('Disable folder collapsing', '!enableCollapsing',
						restartDesc('When enabled, folders in the file explorer will only collapse when clicking the collapse icon next to the folder name, not when clicking near a folder name when it has a folder note.')),
					toggle('Use submenus', 'useSubmenus', 'Use submenus for file/folder commands'),
					toggle('Auto update folder name in the file explorer (front matter title plugin only)', 'frontMatterTitle.explorer',
						'Automatically update the folder name in the file explorer when the front matter title plugin is enabled and the title for a folder note is changed in the front matter. This will not change the file name, only the displayed name in the file explorer.',
						{ visible: () => settings.frontMatterTitle.enabled }),
				],
			},
			{
				type: 'group',
				heading: 'Style',
				items: [
					toggle('Highlight folder in the file explorer', 'highlightFolder',
						'Highlight the folder in the file explorer when it has a folder note and the folder note is open in the editor'),
					toggle('Hide collapse icon', 'hideCollapsingIcon',
						'Hide the collapse icon in the file explorer next to the name of a folder when a folder only contains a folder note'),
					toggle('Hide collapse icon for every empty folder', 'hideCollapsingIconForEmptyFolders',
						'Hide the collapse icon in the file explorer next to the name of a folder when a folder is empty'),
					toggle('Hide collapse icon also when only the attachment folder is in the same folder', 'ignoreAttachmentFolder',
						undefined, { visible: () => settings.hideCollapsingIcon }),
					toggle('Underline the name of folder notes', 'underlineFolder', 'Add an underline to folders that have a folder note in the file explorer'),
					toggle('Bold the name of folder notes', 'boldName', 'Make the folder name bold in the file explorer when it has a folder note'),
					toggle('Cursive the name of folder notes', 'cursiveName', 'Make the folder name cursive in the file explorer when it has a folder note'),
				],
			},
			{
				type: 'group',
				heading: 'Advanced',
				items: [
					{
						name: 'File explorer reveal margin',
						desc: 'Controls the margin around a folder when revealing a hidden folder note in the file explorer. Increase this if the revealed folder is not shown correctly.',
						control: { type: 'slider', key: 'fileExplorerRevealMargin', min: 0, max: MAX_FILE_EXPLORER_REVEAL_MARGIN, step: 1 },
					},
				],
			},
		],
	};
}

function pathPage(tab: SettingsTab): SettingDefinitionPage {
	const { settings } = tab.plugin;
	return {
		type: 'page',
		name: 'Path',
		desc: 'Opening folder notes from the path above a note, and path styling.',
		items: [
			{
				type: 'group',
				heading: 'Behavior',
				items: [
					toggle('Open folder note through path', 'openFolderNoteOnClickInPath',
						'Open a folder note when clicking on a folder name in the path if it is a folder note'),
					toggle('Open sidebar when opening a folder note through path (mobile only)', 'openSidebar.mobile',
						'Open the sidebar when opening a folder note through the path on mobile',
						{ visible: () => settings.openFolderNoteOnClickInPath }),
					toggle('Open sidebar when opening a folder note through path (desktop only)', 'openSidebar.desktop',
						'Open the sidebar when opening a folder note through the path on desktop',
						{ visible: () => settings.openFolderNoteOnClickInPath }),
					toggle('Auto update folder name in the path (front matter title plugin only)', 'frontMatterTitle.path',
						'Automatically update the folder name in the path when the front matter title plugin is enabled and the title for a folder note is changed in the front matter. This will not change the file name, only the displayed name in the path.',
						{ visible: () => settings.frontMatterTitle.enabled }),
				],
			},
			{
				type: 'group',
				heading: 'Style',
				items: [
					toggle('Underline folders in the path', 'underlineFolderInPath', 'Add an underline to folders that have a folder note in the path above a note'),
					toggle('Bold folders in the path', 'boldNameInPath', 'Make the folder name bold in the path above a note when it has a folder note'),
					toggle('Cursive the name of folder notes in the path', 'cursiveNameInPath', 'Make the folder name cursive in the path above a note when it has a folder note'),
					toggle('Hide folder note name in the path', 'hideFolderNoteNameInPath', 'Only show the folder name in the path and hide the folder note name.'),
				],
			},
		],
	};
}

function createOverviewDefaultsPage(tab: SettingsTab): SettingPage {
	class OverviewDefaultsPage extends SettingPage {
		display(): void {
			this.containerEl.empty();
			renderOverviewDefaults(tab, this.containerEl);
		}
	}
	const page = new OverviewDefaultsPage();
	page.title = 'Default overview settings';
	return page;
}

function folderOverviewPage(tab: SettingsTab): SettingDefinitionPage {
	return {
		type: 'page',
		name: 'Folder overview',
		desc: 'Link auto-updating and the default settings for new overviews.',
		items: [
			{
				type: 'group',
				heading: 'Global settings',
				items: [
					toggle('Auto-update links without opening the overview', 'fvGlobalSettings.autoUpdateLinks',
						'If enabled, the links that appear in the graph view will be updated even when you don\'t have the overview open somewhere.'),
					{
						type: 'page',
						name: 'Default overview settings',
						desc: 'Style, title, included file types, sorting, and links for new folder overviews.',
						page: () => createOverviewDefaultsPage(tab),
					},
				],
			},
		],
	};
}

function visibleExcludedFolders(tab: SettingsTab): ExcludedFolder[] {
	return tab.plugin.settings.excludeFolders
		.filter((folder) => !folder.hideInSettings)
		.sort((a, b) => a.position - b.position);
}

function isPattern(folder: ExcludedFolder): boolean {
	return folder.string?.trim() !== '' && folder.path?.trim() === '';
}

function renderExcludedFolder(tab: SettingsTab, setting: Setting, excludedFolder: ExcludedFolder): void {
	const { plugin } = tab;
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		new FolderSuggest(cb.inputEl, plugin, false);
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Folder path');
		cb.setValue(excludedFolder.path || '');
		cb.onChange(async (value) => {
			if (value.startsWith('{regex}') || value.includes('*')) {
				const pattern = new ExcludePattern(value, excludedFolder.position, undefined, plugin);
				await deleteExcludedFolder(plugin, excludedFolder);
				addExcludedFolder(plugin, pattern);
				tab.refresh();
				return;
			}
			if (!plugin.app.vault.getAbstractFileByPath(value)) return;
			excludedFolder.path = value;
			updateExcludedFolder(plugin, excludedFolder, excludedFolder);
		});
	});
	setting.addExtraButton((cb) => cb
		.setIcon('settings')
		.setTooltip('Edit excluded folder')
		.onClick(() => new ExcludedFolderSettings(plugin.app, plugin, excludedFolder).open()));
}

function renderExcludedPattern(tab: SettingsTab, setting: Setting, pattern: ExcludePattern): void {
	const { plugin } = tab;
	setting.setClass('fn-exclude-folder-list');
	setting.addSearch((cb) => {
		cb.containerEl.addClass('fn-exclude-folder-path');
		cb.setPlaceholder('Pattern');
		cb.setValue(pattern.string);
		cb.onChange((value) => {
			pattern.string = value;
			updatePattern(plugin, pattern, pattern);
		});
	});
	setting.addExtraButton((cb) => cb
		.setIcon('settings')
		.setTooltip('Edit pattern')
		.onClick(() => new PatternSettings(plugin.app, plugin, pattern).open()));
}

function reorderExcludedFolders(tab: SettingsTab, oldIndex: number, newIndex: number): void {
	const visible = visibleExcludedFolders(tab);
	const slots = visible.map((folder) => folder.position);
	const [moved] = visible.splice(oldIndex, 1);
	visible.splice(newIndex, 0, moved);
	visible.forEach((folder, index) => {
		folder.position = slots[index];
	});
	tab.plugin.settings.excludeFolders.sort((a, b) => a.position - b.position);
	void tab.plugin.saveSettings(true);
	tab.refresh();
}

function excludedFoldersList(tab: SettingsTab): SettingDefinitionList {
	const { plugin } = tab;
	const folders = visibleExcludedFolders(tab);
	return {
		type: 'list',
		heading: 'Excluded folders and patterns',
		emptyState: 'No excluded folders yet.',
		items: folders.map((folder): SettingGroupItem => ({
			name: isPattern(folder) ? folder.string : folder.path,
			searchable: false,
			render: (setting: Setting): void => {
				if (isPattern(folder)) {
					renderExcludedPattern(tab, setting, folder as ExcludePattern);
				} else {
					renderExcludedFolder(tab, setting, folder);
				}
			},
		})),
		onReorder: (oldIndex, newIndex) => reorderExcludedFolders(tab, oldIndex, newIndex),
		onDelete: (index): void => {
			const folder = folders[index];
			if (!folder) return;
			const done = isPattern(folder)
				? deletePattern(plugin, folder as ExcludePattern)
				: deleteExcludedFolder(plugin, folder);
			void done.then(() => tab.refresh());
		},
		addItem: {
			name: 'Add excluded folder',
			action: (): void => {
				const excludedFolder = new ExcludedFolder('', plugin.settings.excludeFolders.length, undefined, plugin);
				addExcludedFolder(plugin, excludedFolder);
				tab.refresh();
			},
		},
	};
}

function excludedFoldersPage(tab: SettingsTab): SettingDefinitionPage {
	const { plugin } = tab;
	const patternHelp = createFragment((frag) => {
		frag.appendText('Add {regex} at the beginning of the folder name to use a regex pattern.');
		frag.createEl('br');
		frag.appendText('Use * before and after to exclude folders that include the name between the *s.');
		frag.createEl('br');
		frag.appendText('Use * before the folder name to exclude folders that end with the folder name.');
		frag.createEl('br');
		frag.appendText('Use * after the folder name to exclude folders that start with the folder name.');
		frag.createEl('br');
		frag.createSpan({
			cls: 'fn-restart-note',
			text: 'The regexes and wildcards are only for the folder name, not the path. If you want to switch to a folder path delete the pattern first.',
		});
	});
	return {
		type: 'page',
		name: 'Excluded folders',
		desc: 'Excluded folders and patterns, whitelisted folders, and their default settings.',
		items: [
			{
				type: 'group',
				items: [
					{ name: 'Patterns', desc: patternHelp, aliases: ['regex', 'wildcard'] },
					{
						name: 'Whitelisted folders',
						desc: 'Folders that override the excluded folders/patterns',
						action: () => new WhitelistedFoldersSettings(tab).open(),
					},
					{
						name: 'Exclude folder default settings',
						desc: 'Settings applied to newly excluded folders.',
						action: () => new ExcludedFolderSettings(tab.app, plugin, plugin.settings.excludeFolderDefaultSettings).open(),
					},
					{
						name: 'Exclude pattern default settings',
						desc: 'Settings applied to newly excluded patterns.',
						action: () => new PatternSettings(tab.app, plugin, plugin.settings.excludePatternDefaultSettings).open(),
					},
				],
			},
			excludedFoldersList(tab),
		],
	};
}

export function getFolderNotesSettingDefinitions(tab: SettingsTab): SettingDefinitionItem[] {
	normalizeFolderNoteType(tab);
	const fmtpDesc = createFragment((frag) => {
		frag.appendText('Allows you to use the ');
		frag.createEl('a', {
			text: 'Front matter title plugin',
			href: 'https://github.com/snezhig/obsidian-front-matter-title',
			attr: { target: '_blank' },
		});
		frag.appendText(' with folder notes. It allows you to set the folder name to some name you set in the front matter. ');
		frag.createSpan({ cls: 'fn-restart-note', text: 'Requires a restart to take effect.' });
	});
	return [
		{
			type: 'group',
			heading: 'Configuration',
			items: [folderNotesPage(tab), behaviorPage(tab), automationPage(tab)],
		},
		{
			type: 'group',
			heading: 'Display',
			items: [fileExplorerPage(tab), pathPage(tab), folderOverviewPage(tab)],
		},
		{
			type: 'group',
			heading: 'Exclusions',
			items: [excludedFoldersPage(tab)],
		},
		{
			type: 'group',
			heading: 'Integrations',
			items: [
				toggle('Enable front matter title plugin integration', 'frontMatterTitle.enabled', fmtpDesc, { aliases: ['fmtp'] }),
			],
		},
	];
}
