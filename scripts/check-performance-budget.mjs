import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const distDirectory = join(process.cwd(), 'dist');
const indexPath = join(distDirectory, 'index.html');
const budgets = {
  javascriptGzipBytes: 200_000,
  stylesheetGzipBytes: 55_000,
};

if (!existsSync(indexPath)) {
  throw new Error(`Performance budget requires a build at ${indexPath}`);
}

const html = readFileSync(indexPath, 'utf8');
const moduleScripts = [...html.matchAll(/<script\b[^>]*type=["']module["'][^>]*src=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);
const stylesheets = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g)].map((match) => match[1]);

if (moduleScripts.length === 0) {
  throw new Error('Performance budget could not find the initial module script in dist/index.html');
}

function measureAssets(label, assetReferences) {
  const measurements = assetReferences.map((assetReference) => {
    const relativePath = assetReference.split('?')[0].replace(/^\/+/, '');
    const assetPath = join(distDirectory, relativePath);
    if (!existsSync(assetPath)) {
      throw new Error(`Performance budget asset is missing: ${assetPath}`);
    }
    const contents = readFileSync(assetPath);
    return {
      label,
      path: relativePath,
      rawBytes: contents.length,
      gzipBytes: gzipSync(contents, { level: 9 }).length,
    };
  });

  return {
    label,
    assets: measurements,
    rawBytes: measurements.reduce((total, measurement) => total + measurement.rawBytes, 0),
    gzipBytes: measurements.reduce((total, measurement) => total + measurement.gzipBytes, 0),
  };
}

const javascript = measureAssets('initial JavaScript', moduleScripts);
const stylesheet = measureAssets('initial CSS', stylesheets);

for (const measurement of [javascript, stylesheet]) {
  const assetSummary = measurement.assets.map((asset) => asset.path).join(', ');
  console.log(`${measurement.label}: ${measurement.rawBytes} raw bytes, ${measurement.gzipBytes} gzip bytes (${assetSummary})`);
}

const failures = [];
if (javascript.gzipBytes > budgets.javascriptGzipBytes) {
  failures.push(`initial JavaScript gzip ${javascript.gzipBytes} exceeds ${budgets.javascriptGzipBytes}`);
}
if (stylesheet.gzipBytes > budgets.stylesheetGzipBytes) {
  failures.push(`initial CSS gzip ${stylesheet.gzipBytes} exceeds ${budgets.stylesheetGzipBytes}`);
}

if (failures.length > 0) {
  throw new Error(`Performance budget failed: ${failures.join('; ')}`);
}

console.log('Performance budget passed.');
