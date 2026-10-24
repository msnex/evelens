# Deb packages

Prerequisites: Rust, `pnpm`, `cargo-deb`, and `dpkg-deb`.

Build both packages:

```bash
./packaging/build-deb.sh
```

This writes:

```
target/debian/evelens-console_0.1.0-1_<arch>.deb
target/debian/evelens-evelog_0.1.0-1_<arch>.deb
```

Install them with:

```bash
sudo apt install ./target/debian/evelens-console_*.deb ./target/debian/evelens-evelog_*.deb
```

The packages install to separate component directories:

```
/opt/evelens/console/bin/console
/opt/evelens/console/etc/console.toml
/opt/evelens/console/web/dist/
/opt/evelens/evelog/bin/evelog
/opt/evelens/evelog/etc/evelog.toml
```

Both packages create and use the dedicated `evelens` system user. The
`evelens-console` and `evelens-evelog` units are enabled and started
automatically on install. The TOML files are registered as conffiles, so edits
survive package upgrades. Restart the services after changing them:

```bash
sudo systemctl restart evelens-console evelens-evelog
```

If evelog is configured to use the `eve.file` source, add the `evelens` user to
a group that can read `/var/log/suricata` (for example `suricata`) or grant
access with ACLs. Purging the packages does not remove the `evelens` user.
