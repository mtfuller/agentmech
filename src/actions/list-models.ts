import OllamaClient = require('../ollama/ollama-client');

interface ListModelsOptions {
    ollamaUrl: string;
}

export async function listModels(options: ListModelsOptions) {
    try {
        const client = new OllamaClient(options.ollamaUrl);
        console.log('Fetching available models...\n');

        const models = await client.listModels();

        if (models.length === 0) {
            console.log('No models found. Pull a model using: ollama pull <model-name>');
        } else {
            console.log('Available models:');
            models.forEach(model => {
                console.log(`  - ${model.name} (${(model.size / 1e9).toFixed(2)} GB)`);
            });
        }

    } catch (error: any) {
        console.error(`\nError: ${error.message}`);
        process.exit(1);
    }
}