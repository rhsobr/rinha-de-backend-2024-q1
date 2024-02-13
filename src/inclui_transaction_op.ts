import postgres from "postgres";
import { HTTP_CODES } from "./http_codes";

const exec = async (
  sqlClient: postgres.Sql,
  { clienteId, valor, tipo, descricao }: any
) => {
  const [client] = await sqlClient.unsafe(
    `SELECT inclui_transacao(${clienteId}, '${tipo}', ${valor}, '${descricao.replace(
      /'/g,
      "''"
    )}') AS r`
  );

  if (!client?.r) {
    return {
      status: HTTP_CODES.UnprocessableContent,
    };
  }

  return {
    status: HTTP_CODES.Ok,
    data: client.r,
  };
};

export default {
  exec,
};
