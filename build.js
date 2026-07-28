const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const BUILD = path.join(DIST, "build");
const LIBRARY_NAME = "H5P.TimedAssessment";
const LIBRARY_BUILD = path.join(BUILD, LIBRARY_NAME);

function log(message) {
  console.log(message);
}

function cleanBuild() {
  log("Cleaning build directory...");
  fs.rmSync(BUILD, { recursive: true, force: true });
  fs.mkdirSync(BUILD, { recursive: true });
}

function ensureDirectory(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function copyFile(source, destination) {
  ensureDirectory(path.dirname(destination));
  fs.copyFileSync(source, destination);
  log(`Copied file: ${source}`);
}

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    log(`Skipped missing directory: ${source}`);
    return;
  }

  ensureDirectory(destination);
  fs.cpSync(source, destination, { recursive: true });
  log(`Copied directory: ${source}`);
}

function buildPackageStructure() {

  // Archivos del paquete H5P
  copyFile(
    path.join(ROOT, "h5p.json"),
    path.join(BUILD, "h5p.json")
  );

  copyDirectory(
    path.join(ROOT, "content"),
    path.join(BUILD, "content")
  );

  // Biblioteca
  ensureDirectory(LIBRARY_BUILD);

  copyFile(
    path.join(ROOT, "library.json"),
    path.join(LIBRARY_BUILD, "library.json")
  );

  copyFile(
    path.join(ROOT, "semantics.json"),
    path.join(LIBRARY_BUILD, "semantics.json")
  );

  //copyFile(
  //  path.join(ROOT, "LICENSE"),
  //  path.join(LIBRARY_BUILD, "LICENSE")
  //);

  copyFile(
    path.join(ROOT, "README.md"),
    path.join(LIBRARY_BUILD, "README.md")
  );

  copyFile(
    path.join(ROOT, "upgrades.js"),
    path.join(LIBRARY_BUILD, "upgrades.js")
  );

  copyDirectory(
    path.join(ROOT, "scripts"),
    path.join(LIBRARY_BUILD, "scripts")
  );

  copyDirectory(
    path.join(ROOT, "styles"),
    path.join(LIBRARY_BUILD, "styles")
  );

  copyDirectory(
    path.join(ROOT, "language"),
    path.join(LIBRARY_BUILD, "language")
  );

  copyDirectory(
    path.join(ROOT, "images"),
    path.join(LIBRARY_BUILD, "images")
  );

}

function createH5P() {

  return new Promise((resolve, reject) => {

    const output = fs.createWriteStream(
      path.join(DIST, "TimedAssessment.h5p")
    );

    const archive = archiver("zip", {
      zlib: { level: 9 }
    });

    output.on("close", () => {
      log("");
      log(`Package created (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on("error", reject);

    archive.pipe(output);

    // IMPORTANTE:
    // Se comprime el CONTENIDO de build,
    // no la carpeta build.
    archive.directory(BUILD, false);

    archive.finalize();

  });

}

async function main() {
  log("");
  log("=== Timed Assessment Build ===");
  log("");

  cleanBuild();

  buildPackageStructure();
  await createH5P();
  log("");
  log("Build completed successfully.");
  log("");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});