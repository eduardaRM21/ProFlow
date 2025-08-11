import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

// Criar cliente Supabase para uso no servidor
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: Request) {
  const { usuario, senha } = await req.json();

  if (!usuario || !senha) {
    return NextResponse.json({ success: false, message: "Dados incompletos." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("usuario_custos")
    .select("senha")
    .eq("nome", usuario)
    .single();

  if (error || !data) {
    return NextResponse.json({ success: false, message: "Usuário não encontrado." }, { status: 401 });
  }

  const senhaCorreta = await bcrypt.compare(senha, data.senha);

  if (!senhaCorreta) {
    return NextResponse.json({ success: false, message: "Senha incorreta." }, { status: 401 });
  }

  return NextResponse.json({ success: true, message: "Login autorizado." });
}