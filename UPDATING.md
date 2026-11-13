# Updating the upstream version

## Determining the upstream version

### Easy!Appointments

The pin is `images.app.source.dockerTag` in `startos/manifest/index.ts`. Upstream's image is built from [`alextselegidis/easyappointments-docker`](https://github.com/alextselegidis/easyappointments-docker) and published to Docker Hub as `alextselegidis/easyappointments:<release>`. A rebuild of a release, for example for a base-image security fix, is pushed under the same tag and also under a suffixed tag such as `1.6.1-php2shell-fix`.

```bash
gh release view -R alextselegidis/easyappointments --json tagName -q .tagName
curl -s "https://hub.docker.com/v2/repositories/alextselegidis/easyappointments/tags?page_size=20&ordering=last_updated" | jq -r '.results[].name'
gh api repos/alextselegidis/easyappointments-docker/commits --jq '.[0:5][] | "\(.commit.author.date) \(.commit.message|split("\n")[0])"'
```

### MySQL

The pin is `images.mysql.source.dockerTag`, on the 8.4 LTS line.

```bash
curl -s "https://hub.docker.com/v2/repositories/library/mysql/tags?page_size=50&name=8.4." | jq -r '.results[].name' | grep -E '^8\.4\.[0-9]+$'
```

## Applying the bump

### Easy!Appointments

1. Set `dockerTag` to the newest tag for the release. When a suffixed rebuild exists, pin the suffixed tag, because the plain tag may have been re-pushed under it.
2. Check that both arches are published: `docker manifest inspect <image>:<tag>`.
3. Re-read upstream's `assets/docker-entrypoint.sh` and the release's `config-sample.php` and `application/config/email.php`. The package replaces the entrypoint, so `configPhp` and `emailPhp` in `startos/utils.ts` must match the files upstream expects.
4. Set the upstream part of the version in `startos/versions/current.ts` to the release.

### MySQL

Bump within 8.4.x only. A major version change moves the data directory to a new on-disk format.
