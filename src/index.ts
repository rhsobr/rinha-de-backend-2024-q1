import { Elysia } from "elysia";
import getDbClient from "./db";
import postgres from "postgres";
import { HTTP_CODES } from "./http_codes";
import incluiTransacao from "./inclui_transaction_op";

const rwClient = getDbClient({
  applicationName: "rw",
  maxPoolSize: Number(Bun.env.DB_MAX_RW_CONNECTIONS || 1),
});

const roClient = getDbClient({
  applicationName: "ro",
  maxPoolSize: Number(Bun.env.DB_MAX_RO_CONNECTIONS || 1),
});

const app = new Elysia()
  .get("/healthcheck", async () => {
    const check = (sql: postgres.TransactionSql) =>
      sql.unsafe("SELECT 1 FROM clientes LIMIT 1");

    await Promise.all([roClient.begin(check), rwClient.begin(check)]);

    return "OK";
  })
  .group("/clientes/:id", (app) =>
    app
      .post("/transacoes", async ({ body, params, set }) => {
        const { id: idParam } = params as any;
        const { valor, tipo, descricao } = body as any;

        const id = Number(idParam);

        if (!Number.isInteger(id) || id > 5) {
          set.status = HTTP_CODES.UnprocessableContent;
          return;
        }

        // 😱
        if (id > 5) {
          set.status = 404;
          return;
        }

        if (tipo !== "d" && tipo !== "c") {
          set.status = HTTP_CODES.UnprocessableContent;
          return;
        }

        if (!descricao?.length || descricao.length > 10) {
          set.status = HTTP_CODES.UnprocessableContent;
          return;
        }

        const numValor = Number(valor);

        if (!Number.isInteger(numValor) || numValor <= 0) {
          set.status = HTTP_CODES.UnprocessableContent;
          return;
        }

        const { status, data } = await incluiTransacao.exec(roClient, {
          clienteId: id,
          valor: numValor,
          tipo,
          descricao,
        });

        set.status = status;

        return data;
      })
      .get("/extrato", async ({ params, set }) => {
        const { id: idParam } = params as any;

        const id = Number(idParam);

        if (!Number.isInteger(id)) {
          set.status = HTTP_CODES.UnprocessableContent;
          return;
        }

        // 😱
        if (id > 5) {
          set.status = 404;
          return;
        }

        const [cliente] = await roClient.unsafe(
          `SELECT gera_extrato(${id}) AS r`
        );

        if (!cliente?.r?.s) {
          set.status = HTTP_CODES.NotFound;
          return;
        }

        set.status = HTTP_CODES.Ok;

        const { s, ut: ultimasTransacoes } = cliente.r;

        return {
          saldo: {
            total: s.t,
            limite: s.l,
            data_extrato: new Date().toISOString(),
          },
          ultimas_transacoes: ultimasTransacoes.map(
            ({ v: valor, t: tipo, d: descricao, r: realizada_em }: any) => ({
              valor,
              tipo,
              descricao,
              realizada_em,
            })
          ),
        };
      })
  )
  .onError(({ error, set }) => {
    set.status = HTTP_CODES.UnprocessableContent;
    return { msg: error.message, stack: error.stack };
  })
  .listen(Number(Bun.env.API_PORT || 3000));

console.log(`App is running at ${app.server?.hostname}:${app.server?.port}`);
