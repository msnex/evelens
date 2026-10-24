# Maintainer scripts

cargo-deb generates the systemd and sysusers maintainer script fragments
automatically. This directory must exist because cargo-deb only emits those
fragments when `maintainer-scripts` is configured.

If package-specific scripts are added later (for example
`evelens-console.postinst`), keep the `#DEBHELPER#` token so cargo-deb can
splice the generated fragments into the script.
