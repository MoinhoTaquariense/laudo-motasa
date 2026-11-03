import fetch from "node-fetch";

const webhookUrl = "http://192.168.1.168:5678/webhook-test/8efca1ed-1d7c-4b2f-8820-9ac305f7a601";

async function notifyTableCreation(tableName: string) {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: tableName })
    });
    if (!response.ok) {
      throw new Error(`Erro ao enviar para webhook: ${response.status}`);
    }
    console.log("Webhook enviado com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar webhook:", error);
  }
}

// Exemplo de uso:
notifyTableCreation("TABELAS_CADASTRADAS_PR");
