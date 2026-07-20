import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const DATA_PATH = path.join(process.cwd(), "data", "meta-v2.json");

export async function GET() {
  if (!fs.existsSync(DATA_PATH)) {
    return NextResponse.json({ error: "Dati Meta-sistema v2 non ancora esportati." }, { status: 404 });
  }
  try {
    return NextResponse.json(JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")));
  } catch (err: any) {
    return NextResponse.json({ error: `Errore dati Meta v2: ${err.message}` }, { status: 500 });
  }
}
