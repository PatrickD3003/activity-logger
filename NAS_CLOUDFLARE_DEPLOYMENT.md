# NAS + Cloudflare Deployment Guide

This guide documents the working deployment path for the Factory Activity Logger on a Synology NAS with Cloudflare Tunnel.

## Target Setup

```text
Users
  -> https://activity.coffeeandtea.site
  -> Cloudflare Access / Cloudflare Tunnel
  -> Synology NAS
  -> Docker app on port 19000
  -> PostgreSQL container
```

The NAS app remains private on the local network. Cloudflare Tunnel publishes only the selected hostname.

## 1. Run The App On Synology NAS

Upload the project folder to the NAS, for example:

```text
/volume1/docker/activity-logger
```

Use this `docker-compose.yml` shape:

```yaml
services:
  app:
    build: .
    restart: unless-stopped
    ports:
      - "19000:3000"
    environment:
      DATABASE_URL: "postgresql://factory_logger:CHANGE_THIS_PASSWORD@postgres:5432/factory_logger"
      DATABASE_SSL: "false"
      APP_AUTH_MODE: "basic"
      APP_BASIC_USERNAME: "admin"
      APP_BASIC_PASSWORD: "CHANGE_THIS_LONG_PASSWORD"
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: factory_logger
      POSTGRES_USER: factory_logger
      POSTGRES_PASSWORD: CHANGE_THIS_PASSWORD
    volumes:
      - factory_logger_postgres:/var/lib/postgresql/data
      - ./database/postgres-schema.sql:/docker-entrypoint-initdb.d/001-schema.sql:ro

volumes:
  factory_logger_postgres:
```

Important:

- Keep the app container mapped as `19000:3000`.
- Do not publish PostgreSQL port `5432`.
- Use strong passwords instead of the placeholders.
- Rebuild/recreate the Container Manager project after changing environment variables.

Verify from the NAS LAN:

```text
http://192.168.0.147:19000
```

The browser should ask for the Basic Auth username and password.

## 2. Connect Domain To Cloudflare

For the domain:

```text
coffeeandtea.site
```

In Cloudflare:

1. Choose **Connect a domain**.
2. Enter `coffeeandtea.site`.
3. Choose the Free plan.
4. Cloudflare assigns two nameservers.

At the domain registrar, replace the old nameservers with the Cloudflare nameservers. In this setup the assigned nameservers were:

```text
dion.ns.cloudflare.com
laura.ns.cloudflare.com
```

Wait until Cloudflare marks the domain as active.

## 3. Create Cloudflare Tunnel

In Cloudflare Zero Trust:

```text
Zero Trust -> Networks -> Tunnels -> Create tunnel
```

Use:

```text
Tunnel type: Cloudflared
Tunnel name: activity-logger
Connector method: Docker
```

Cloudflare will provide a command similar to:

```bash
docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token TOKEN
```

If creating the container manually in Synology Container Manager:

```text
Image: cloudflare/cloudflared:latest
Container name: cloudflared-activity-logger
Auto-restart: enabled
Port mapping: none
Command/arguments: tunnel --no-autoupdate run --token TOKEN
```

Do not paste `docker run` or the image name into the command field when using Synology's container wizard.

If using NAS terminal instead:

```bash
sudo docker run -d --name cloudflared-activity-logger --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token TOKEN
```

After starting the container, Cloudflare should show the connector as connected.

Security note: if a tunnel token is pasted somewhere public or shared accidentally, create a new tunnel/token and replace the container.

## 4. Add Public Hostname Route

In the tunnel, add a route using:

```text
Route type: Published application
Subdomain: activity
Domain: coffeeandtea.site
Path: empty
Service type: HTTP
Service URL: http://192.168.0.147:19000
```

Final public URL:

```text
https://activity.coffeeandtea.site
```

If Cloudflare and the NAS are on the same machine/network, `http://192.168.0.147:19000` is reliable. `http://localhost:19000` may also work when the tunnel container can reach the host port, but the NAS LAN IP is clearer.

## 5. Security Hardening

Minimum recommended protections:

- Keep `APP_AUTH_MODE` set to `basic`.
- Use a long Basic Auth password.
- Keep PostgreSQL private; do not publish `5432`.
- Keep DSM ports `5000` and `5001` private unless they are separately protected.
- Use Cloudflare Tunnel instead of router port forwarding.
- Enable Cloudflare Access for `activity.coffeeandtea.site` and allow only trusted emails.
- Keep Synology and Container Manager updated.
- Back up the Docker PostgreSQL volume regularly.

Recommended Cloudflare Access setup:

```text
Zero Trust -> Access -> Applications -> Add application -> Self-hosted
Application domain: activity.coffeeandtea.site
Policy action: Allow
Allowed users: trusted email addresses only
```

This gives two layers:

```text
Cloudflare Access login -> app Basic Auth -> Activity Logger
```

## Shared Data Behavior

The deployed app stores shared session metadata and activity logs in PostgreSQL. New devices load available sessions from the server and poll the active session logs every 5 seconds, so operators viewing the same session see the same progress. Browser localStorage is still used as a fallback cache when the server is unavailable.

## 6. Troubleshooting

If a Docker port says it is already in use:

```bash
sudo netstat -tulpn | grep PORT
```

If `nginx: master` is using the port, Web Station owns that port. Delete or edit the Web Station portal, or choose a different Docker port.

If the app container is green but the site is unreachable from outside:

- Confirm Cloudflare tunnel connector is connected.
- Confirm the public hostname route points to `http://192.168.0.147:19000`.
- Confirm the app works locally at `http://192.168.0.147:19000`.
- Confirm Synology firewall allows the local connection if firewall rules are enabled.

If the `cloudflared` container stops immediately:

- Check the container logs.
- Make sure the command does not include `docker run`.
- Make sure the command does not include the image name.
- Use `tunnel --no-autoupdate run --token TOKEN`.
- Regenerate the token if it was copied incorrectly or exposed.
