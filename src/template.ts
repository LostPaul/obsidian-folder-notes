// Thanks to @mgmeyers for the creating the obsidian kanban plugin https://github.com/mgmeyers/obsidian-kanban
// from where I got the template code for this plugin
// https://github.com/mgmeyers/obsidian-kanban/blob/48e6c278ce9140b7e034b181432321f697d6e45e/src/components/helpers.ts

import { TFile, App } from 'obsidian';
import FolderNotesPlugin from './main';
export async function applyTemplate(
    plugin: FolderNotesPlugin,
    file: TFile,
    templatePath?: string
) {
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

            // If both plugins are enabled, attempt to detect templater first

            if (templatesEnabled && templaterEnabled) {
                if (/<%/.test(templateContent)) {
                    return await templaterPlugin.write_template_to_file(
                        templateFile,
                        file
                    );
                }
                return await templatesPlugin.instance.insertTemplate(templateFile);
            }

            if (templatesEnabled) {
                return await templatesPlugin.instance.insertTemplate(templateFile);
            }

            if (templaterEnabled) {
                return await templaterPlugin.write_template_to_file(
                    templateFile,
                    file
                );
            }

        } catch (e) {
            console.error(e);
        }
    }
}

export function getTemplatePlugins(app: App) {
    const templatesPlugin = (app as any).internalPlugins.plugins.templates;
    const templatesEnabled = templatesPlugin.enabled;
    const templaterPlugin = (app as any).plugins.plugins['templater-obsidian'];
    const templaterEnabled = (app as any).plugins.enabledPlugins.has(
        'templater-obsidian'
    );
    const templaterEmptyFileTemplate =
        templaterPlugin &&
        (this.app as any).plugins.plugins['templater-obsidian'].settings
            ?.empty_file_template;

    const templateFolder = templatesEnabled
        ? templatesPlugin.instance.options.folder
        : templaterPlugin
            ? templaterPlugin.settings.template_folder
            : undefined;

    return {
        templatesPlugin,
        templatesEnabled,
        templaterPlugin: templaterPlugin?.templater,
        templaterEnabled,
        templaterEmptyFileTemplate,
        templateFolder,
    };
}