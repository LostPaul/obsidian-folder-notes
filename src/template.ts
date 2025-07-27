import type { App } from 'obsidian';
import { TFile, WorkspaceLeaf } from 'obsidian';
import type FolderNotesPlugin from './main';

export async function applyTemplate(
	plugin: FolderNotesPlugin,
	file: TFile,
	leaf?: WorkspaceLeaf | null,
	templatePath?: string,
) {
	const fileContent = await plugin.app.vault.read(file).catch((err) => {
		console.error(`Error reading file ${file.path}:`, err);
	});
	if (fileContent !== '') return;

	const templateFile = templatePath
		? plugin.app.vault.getAbstractFileByPath(templatePath)
		: null;

	if (templateFile && templateFile instanceof TFile) {
		try {
			const {
				templatesEnabled,
				templaterEnabled,
				templatesPlugin,
				templaterPlugin,
			} = getTemplatePlugins(plugin.app);
			const templateContent = await plugin.app.vault.read(templateFile);
			if (templateContent.includes('==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==')) {
				return;
			}

			// Prioritize Templater if both plugins are enabled
			if (templaterEnabled) {
				return await templaterPlugin.write_template_to_file(templateFile, file);
			} else if (templatesEnabled) {
				if (leaf instanceof WorkspaceLeaf) {
					await leaf.openFile(file);
				}
				return await templatesPlugin.instance.insertTemplate(templateFile);
			}
			await plugin.app.vault.modify(file, templateContent);


		} catch (e) {
			console.error(e);
		}
	}
}

export function getTemplatePlugins(app: App) {
	const templatesPlugin = (app as any).internalPlugins.plugins.templates;
	const templatesEnabled = templatesPlugin.enabled;
	const templaterPlugin = (app as any).plugins.plugins['templater-obsidian'];
	const templaterEnabled = (app as any).plugins.enabledPlugins.has('templater-obsidian');

	const templaterEmptyFileTemplate =
		templaterPlugin && templaterPlugin.settings?.empty_file_template;

	const templateFolder = templatesEnabled
		? templatesPlugin.instance.options.folder
		: templaterPlugin?.settings.template_folder;

	return {
		templatesPlugin,
		templatesEnabled,
		templaterPlugin: templaterPlugin?.templater,
		templaterEnabled,
		templaterEmptyFileTemplate,
		templateFolder,
	};
}
