/* eslint-disable max-len */
import type { Setting, SettingDefinitionItem, SettingGroupItem } from 'obsidian';
import type { SettingsTab } from './SettingsTab';
import type { includeTypes } from '../obsidian-folder-overview/src/FolderOverview';
import { ListComponent } from '../obsidian-folder-overview/src/utils/ListComponent';

const KEY = 'defaultOverview';
const MAX_TITLE_SIZE = 6;
const MAX_DEPTH = 10;
const MAX_INCLUDE_TYPES_FOR_DROPDOWN = 8;

const INCLUDE_TYPE_OPTIONS: Record<string, string> = {
	markdown: 'Markdown',
	folder: 'Folder',
	canvas: 'Canvas',
	pdf: 'PDF',
	image: 'Image',
	audio: 'Audio',
	video: 'Video',
	other: 'All other file types',
	all: 'All file types',
};

function toggle(name: string, field: string, desc?: string, visible?: () => boolean): SettingGroupItem {
	return { name, desc, visible, control: { type: 'toggle', key: `${KEY}.${field}` } } as SettingGroupItem;
}

function docsLink(text: string, anchor: string, before = ''): DocumentFragment {
	return createFragment((frag) => {
		if (before) frag.appendText(before);
		frag.createEl('a', {
			text,
			href: `https://lostpaul.github.io/obsidian-folder-notes/Folder%20overview/#${anchor}`,
			attr: { target: '_blank' },
		});
	});
}

function renderIncludeTypes(tab: SettingsTab, setting: Setting): void {
	const overview = tab.plugin.settings.defaultOverview;
	const list = new ListComponent(setting.settingEl, overview.includeTypes || [], ['markdown', 'folder']);
	list.on('update', (values) => {
		overview.includeTypes = values as includeTypes[];
		void tab.saveOverviewDefaults();
		tab.refresh();
	});
	if (overview.includeTypes.length >= MAX_INCLUDE_TYPES_FOR_DROPDOWN || overview.includeTypes.includes('all')) return;
	setting.addDropdown((dropdown) => {
		Object.entries(INCLUDE_TYPE_OPTIONS)
			.filter(([value]) => !overview.includeTypes.includes(value as includeTypes))
			.forEach(([value, label]) => dropdown.addOption(value, label));
		dropdown.addOption('+', '+');
		dropdown.setValue('+');
		dropdown.onChange(async (value) => {
			if (value === 'all') {
				list.setValues(overview.includeTypes.filter((type) => type === 'folder'));
			}
			await list.addValue(value);
		});
	});
}

export function overviewDefaultsItems(tab: SettingsTab): SettingDefinitionItem[] {
	const overview = (): typeof tab.plugin.settings.defaultOverview => tab.plugin.settings.defaultOverview;
	const isExplorer = (): boolean => overview().style === 'explorer';
	const isList = (): boolean => overview().style === 'list';
	const showsOtherTypes = (): boolean => overview().includeTypes.some((type) => type !== 'markdown' && type !== 'folder');
	const intro = createFragment((frag) => {
		frag.appendText('Edit the default settings for new folder overviews, ');
		frag.createSpan({ cls: 'fn-restart-note', text: "this won't apply to already existing overviews." });
	});
	return [
		{
			type: 'group',
			heading: 'General',
			items: [
				{ name: 'Defaults for new overviews', desc: intro, searchable: false },
				toggle('Auto sync', 'autoSync', 'Choose if the overview should automatically update when you delete, create or rename a file/folder'),
				toggle('Show the title', 'showTitle', 'Choose if the title above the folder overview should be shown'),
				{
					name: 'Title',
					desc: docsLink('Find more information about the title in the documentation. There is also a list of variables you can use', 'title'),
					visible: () => overview().showTitle,
					control: { type: 'text', key: `${KEY}.title`, defaultValue: '{{folderName}} overview' },
				},
				{
					name: 'Title size',
					desc: 'The larger the number, the smaller the title will be displayed.',
					visible: () => overview().showTitle,
					control: { type: 'slider', key: `${KEY}.titleSize`, min: 1, max: MAX_TITLE_SIZE, step: 1 },
				},
				{
					name: 'Folder path for the overview',
					desc: docsLink('Find more information about this setting in the documentation.', 'folder-path', 'The overview will show the subfolders and files of the folder you choose here. '),
					control: { type: 'folder', key: `${KEY}.folderPath`, placeholder: 'Folder path', includeRoot: true },
				},
				{
					name: 'Overview style',
					desc: 'Choose the style of the overview (grid style soon)',
					control: { type: 'dropdown', key: `${KEY}.style`, options: { list: 'List', explorer: 'Explorer' } },
				},
			],
		},
		{
			type: 'group',
			heading: 'Content',
			items: [
				{
					name: 'Include types',
					desc: 'File types that are shown in the overview.',
					render: (setting) => renderIncludeTypes(tab, setting),
				},
				toggle('Disable file tag', 'disableFileTag', 'Choose if the file tag should be shown after the file name', showsOtherTypes),
				toggle('Show folder notes', 'showFolderNotes', 'Choose if folder notes (the note itself and not the folder name) should be shown in the overview'),
				{
					name: 'File depth',
					desc: 'File & folder = +1 depth',
					control: { type: 'slider', key: `${KEY}.depth`, min: 1, max: MAX_DEPTH, step: 1 },
				},
				{
					name: 'Sort files by',
					desc: 'Choose how the files should be sorted',
					control: { type: 'dropdown', key: `${KEY}.sortBy`, options: { name: 'Name', created: 'Created', modified: 'Modified' } },
				},
				{
					name: 'Sort order',
					control: { type: 'dropdown', key: 'overviewSortOrder', options: { desc: 'Descending', asc: 'Ascending' } },
				},
				toggle('Show folder names of folders that appear empty in the folder overview', 'showEmptyFolders',
					'Show the names of folders that appear to have no files/folders in the folder overview. That\'s mostly the case when you set the file depth to 1.', isList),
				toggle('Only show empty folders which are on the first level of the folder overview', 'onlyIncludeSubfolders',
					undefined, () => isList() && overview().showEmptyFolders),
			],
		},
		{
			type: 'group',
			heading: 'Explorer style',
			visible: isExplorer,
			items: [
				toggle('Allow drag and drop', 'allowDragAndDrop', 'Choose if you want to allow drag and drop in the overview'),
				toggle('Disable collapse icon for folder notes', 'disableCollapseIcon', 'Remove the collapse icon next to the folder name for folder notes when they only contain the folder note itself'),
				toggle('Store collapsed condition', 'storeFolderCondition', 'Choose if the collapsed condition should be stored until you restart Obsidian'),
				toggle('Collapse all in the tree by default', 'alwaysCollapse', 'Collapse every folder in the file explorer in the overview by default'),
			],
		},
		{
			type: 'group',
			heading: 'Links',
			items: [
				toggle('Use actual links', 'useActualLinks', 'Choose if the links in the overview should be showed in the graph view. This requires a second list under the actual overview and which is hidden by default.'),
				toggle('Use wikilinks', 'useWikilinks', 'Choose if the links in the link list should be in wikilink format or markdown link format (e.g., [[link]] vs [link](url)).', () => overview().useActualLinks),
				toggle('Hide folder overview', 'hideFolderOverview', 'Choose if the folder overview should be hidden and instead only the link list should be shown', () => !overview().hideLinkList && overview().useActualLinks),
				toggle('Hide link list', 'hideLinkList', 'Choose if only link list under the folder overview should be shown', () => !overview().hideFolderOverview && overview().useActualLinks),
			],
		},
		{
			type: 'group',
			heading: 'Integrations',
			visible: () => !!tab.app.plugins.getPlugin('obsidian-front-matter-title-plugin'),
			items: [
				toggle('Front Matter Title Plugin integration', 'fmtpIntegration', 'Replace the folder/file name with the title from the Front Matter Title Plugin. This requires the plugin to be installed and enabled.'),
			],
		},
	];
}
