<?php
    $dircontents = scandir("../uploads");
    $mp3s = [];
    foreach ($dircontents as $file) {
        $extension = pathinfo($file, PATHINFO_EXTENSION);
        if ($extension == 'mp3') {
            $mp3s[] = $file;
        }
    }
    echo json_encode($mp3s, JSON_PRETTY_PRINT);
?>
