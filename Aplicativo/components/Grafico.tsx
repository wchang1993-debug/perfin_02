"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatarData, formatarNumero, formatarPercentual } from "@/lib/formatacao";

// Paleta da marca para séries: grafite → cinzas, com azul-petróleo e azul-cinza para destaque.
const CORES = ["#003E5E", "#221F20", "#97AFBA", "#6D6E71", "#415765", "#A7A9AC"];
const TRACOS = ["0", "0", "6 3", "2 2", "8 4", "4 4"];

export type FormatoValor = "percentual" | "numero" | "cotacao";

export interface Serie {
  chave: string;
  nome: string;
}

interface Props {
  titulo: string;
  dados: Record<string, string | number | null>[];
  series: Serie[];
  formato?: FormatoValor;
  tipo?: "linha" | "barras" | "degraus";
  faixa?: { de: number; ate: number; rotulo: string };
  altura?: number;
}

function formatar(valor: unknown, formato: FormatoValor): string {
  const n = typeof valor === "number" ? valor : Number(valor);
  if (formato === "percentual") return formatarPercentual(n);
  return formatarNumero(n, formato === "cotacao" ? 4 : 2);
}

export function Grafico({ titulo, dados, series, formato = "percentual", tipo = "linha", faixa, altura = 300 }: Props) {
  if (dados.length === 0) {
    return <p className="suave">Sem dados para {titulo.toLowerCase()} no período.</p>;
  }
  const eixoX = <XAxis dataKey="data" tickFormatter={(d: string) => formatarData(d)} minTickGap={32} fontSize={11} />;
  const eixoY = <YAxis tickFormatter={(v: number) => formatar(v, formato)} width={72} fontSize={11} domain={["auto", "auto"]} />;
  const grade = <CartesianGrid stroke="#E6E7E8" vertical={false} />;
  const dica = (
    <Tooltip
      labelFormatter={(d) => formatarData(String(d))}
      formatter={(v) => formatar(v, formato)}
      contentStyle={{ borderRadius: 0, borderColor: "#BCBEC0", fontSize: 12 }}
    />
  );

  return (
    <figure style={{ margin: 0 }} aria-label={titulo}>
      <figcaption className="rotulo" style={{ marginBottom: 8 }}>
        {titulo}
      </figcaption>
      <ResponsiveContainer width="100%" height={altura}>
        {tipo === "barras" ? (
          <BarChart data={dados}>
            {grade}
            {eixoX}
            {eixoY}
            {dica}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={CORES[i % CORES.length]} />
            ))}
          </BarChart>
        ) : (
          <LineChart data={dados}>
            {grade}
            {eixoX}
            {eixoY}
            {dica}
            {faixa && <ReferenceArea y1={faixa.de} y2={faixa.ate} fill="#D5E6EF" fillOpacity={0.6} label={{ value: faixa.rotulo, fontSize: 11, fill: "#003E5E", position: "insideTopLeft" }} />}
            {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
            {series.map((s, i) => (
              <Line
                key={s.chave}
                dataKey={s.chave}
                name={s.nome}
                type={tipo === "degraus" ? "stepAfter" : "monotone"}
                stroke={CORES[i % CORES.length]}
                strokeDasharray={TRACOS[i % TRACOS.length]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        )}
      </ResponsiveContainer>
    </figure>
  );
}
