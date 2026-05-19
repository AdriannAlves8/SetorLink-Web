import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/** Redireciona recuperação de senha para o login com diálogo do Helpdesk */
export default function Recover() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/login?recuperar=1", { replace: true });
  }, [navigate]);

  return null;
}
