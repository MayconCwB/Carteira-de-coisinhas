# Minha Carteira

App pessoal para iPhone, instalável pelo Safari. Guarda imagens e PDFs em IndexedDB no próprio aparelho. Sem login, servidor, bibliotecas externas, analytics ou envio dos documentos. O GitHub Pages hospeda somente os arquivos do aplicativo.

## Publicar no repositório Carteira-de-coisinhas

Envie o conteúdo desta pasta para a raiz do repositório https://github.com/MayconCwB/Carteira-de-coisinhas (não envie os arquivos do projeto TJ Refrigerações).

Em Settings → Pages, escolha Deploy from a branch → main → /(root) → Save. O endereço previsto é https://mayconcwb.github.io/Carteira-de-coisinhas/ e só estará disponível depois da publicação.

## Usar no iPhone

1. Abra o endereço publicado no Safari.
2. Compartilhar → Adicionar à Tela de Início. Se aparecer, mantenha Abrir como App ativado.
3. Abra pelo novo ícone, com internet na primeira abertura, antes de importar documentos. Safari e o app da tela inicial podem ter armazenamentos separados.
4. Adicione fotos ou PDFs. Toque na estrela para favoritar e no documento para ampliar. Abra Ajustes para exportar/restaurar uma cópia local.
5. Depois do primeiro carregamento completo, teste em modo avião.

## Limites

- Arquivos: até 30 MB por documento. Backup: até 200 MB e 500 documentos.
- O iOS pode remover dados locais; limpar dados do site também apaga documentos. Mantenha os originais e exporte uma cópia. A proteção extra depende da decisão do navegador.
- A carteira não se sincroniza entre aparelhos. Outros visitantes do site não veem seus arquivos.
- O aplicativo não possui bloqueio próprio ou criptografia própria; usa a proteção do aparelho e a separação de armazenamento do navegador.
- QR Codes dinâmicos precisam do aplicativo oficial do emissor.
- PDFs usam o visualizador do navegador: caso a prévia não funcione, use Abrir PDF ou Compartilhar / salvar cópia.
- Para atualizar o app, altere o número do cache em sw.js junto com os arquivos modificados.

## Validação

Importação, persistência após recarregar, favoritos, busca, edição, exclusão e backup/restauração devem ser verificados em navegador; uso no Safari real e abertura de PDF no iPhone ainda precisam de validação no aparelho.
