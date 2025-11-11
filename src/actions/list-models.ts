import OllamaClient = require('../ollama/ollama-client');
import CliFormatter from '../utils/cli-formatter';

interface ListModelsOptions {
    ollamaUrl: string;
}

export async function listModels(options: ListModelsOptions) {
    try {
        const client = new OllamaClient(options.ollamaUrl);
        console.log(CliFormatter.loading('Fetching available models...') + '\n');

        const models = await client.listModels();

        if (models.length === 0) {
            console.log(CliFormatter.info('No models found. Pull a model using: ollama pull <model-name>'));
        } else {
            console.log(CliFormatter.header('Available models:'));
            models.forEach(model => {
                const sizeGB = (model.size / 1e9).toFixed(2);
                console.log(`  ${CliFormatter.model(model.name)} ${CliFormatter.dim(`(${sizeGB} GB)`)}`);
            });
        }

    } catch (error: any) {
        console.error('\n' + CliFormatter.error(error.message));
        process.exit(1);
    }
}