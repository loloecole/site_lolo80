import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const pdfDir = "compte_rendu";
const outputFile = "config.json";

/**
 * Calcule SHA-256 d'un fichier (utile pour invalider le cache côté client)
 */
async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const data = await fs.readFile(filePath);
  hash.update(data);
  return hash.digest("hex");
}

/**
 * Retourne la liste des PDFs avec métadonnées.
 */
async function buildPdfIndex() {
  const dir = await fs.opendir(pdfDir);
  const items = [];

  for await (const dirent of dir) {
    if (!dirent.isFile()) continue;
    if (!dirent.name.toLowerCase().endsWith(".pdf")) continue;

    const relPath = path.join(pdfDir, dirent.name);
    const stat = await fs.stat(relPath);

    items.push({
      name: dirent.name,
      path: relPath.replace(/\\/g, "/"),
      size_bytes: stat.size,
      mtime_iso: stat.mtime.toISOString(),
      sha256: await sha256(relPath),
    });
  }

  // tri par nom (ou par date modif desc si tu préfères)
  items.sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return {
    generated_at: new Date().toISOString(),
    count: items.length,
    files: items,
  };
}

(async () => {
  try {
    // Vérifie que le dossier existe
    await fs.access(pdfDir);
  } catch {
    console.error(`Le dossier "${pdfDir}" n'existe pas.`);
    process.exit(1);
  }

  const data = await buildPdfIndex();
  await fs.writeFile(outputFile, JSON.stringify(data, null, 2), "utf8");
  console.log(`Écrit ${outputFile} avec ${data.count} élément(s).`);
})();
