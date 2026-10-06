import { chamarGoogleJson } from "./cliente";

const URL_PLANILHAS = "https://sheets.googleapis.com/v4/spreadsheets";

export type Celula = string | number | null;

export interface Aba {
  nome: string;
  linhas: Celula[][];
}

// Paleta PWM: cabeçalho grafite com texto branco; faixas alternadas em branco quente.
const COR_CABECALHO = { red: 0x22 / 255, green: 0x1f / 255, blue: 0x20 / 255 };
const COR_FAIXA = { red: 0xf9 / 255, green: 0xf4 / 255, blue: 0xf4 / 255 };
const BRANCO = { red: 1, green: 1, blue: 1 };

function formatacaoDaAba(sheetId: number, colunas: number) {
  return [
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: COR_CABECALHO,
            textFormat: { foregroundColor: BRANCO, bold: true, fontSize: 10 },
          },
        },
        fields: "userEnteredFormat(backgroundColor,textFormat)",
      },
    },
    {
      addBanding: {
        bandedRange: {
          range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: Math.max(colunas, 1) },
          rowProperties: { firstBandColor: BRANCO, secondBandColor: COR_FAIXA },
        },
      },
    },
    { updateSheetProperties: { properties: { sheetId, gridProperties: { frozenRowCount: 1 } }, fields: "gridProperties.frozenRowCount" } },
    { autoResizeDimensions: { dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: Math.max(colunas, 1) } } },
  ];
}

export async function criarPlanilha(
  accessToken: string,
  titulo: string,
  abas: Aba[],
): Promise<{ id: string; url: string }> {
  const planilha = await chamarGoogleJson<{ spreadsheetId: string; spreadsheetUrl: string }>(
    accessToken,
    "Google Planilhas",
    URL_PLANILHAS,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        properties: { title: titulo, locale: "pt_BR", timeZone: "America/Sao_Paulo" },
        sheets: abas.map((aba, indice) => ({ properties: { sheetId: indice, title: aba.nome } })),
      }),
    },
  );

  await chamarGoogleJson(accessToken, "Google Planilhas", `${URL_PLANILHAS}/${planilha.spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: abas.map((aba) => ({ range: `'${aba.nome}'!A1`, values: aba.linhas })),
    }),
  });

  await chamarGoogleJson(accessToken, "Google Planilhas", `${URL_PLANILHAS}/${planilha.spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: abas.flatMap((aba, indice) => formatacaoDaAba(indice, aba.linhas[0]?.length ?? 1)),
    }),
  });

  return { id: planilha.spreadsheetId, url: planilha.spreadsheetUrl };
}
