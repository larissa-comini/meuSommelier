// A web usa seu armazenamento nativo; SQLite fica restrito ao app.
export const readDemoStorage = async () => window.localStorage.getItem('meu-sommelier.demo.v1');
export const writeDemoStorage = async (value: string) => { window.localStorage.setItem('meu-sommelier.demo.v1', value); };
