<?php

$root_dir = __DIR__ . '/..';
$src_dir = $root_dir . "/src";
$build_dir = $root_dir . "/builds";
$install_manifest = $root_dir . "/src/install.rdf";

$xml = new SimpleXMLElement($install_manifest, 0, true);
$version = trim(
  $xml->xpath('//em:version')[0]
);

$outfile = sprintf(
  "%s/savedsearchinsubfolders-%s.xpi",
  $build_dir, $version
);

$cmd = <<<EOS
bash -c "
pushd $src_dir;
zip -r $outfile *;
popd;
"
EOS;

passthru($cmd, $r);
echo $r . PHP_EOL;

