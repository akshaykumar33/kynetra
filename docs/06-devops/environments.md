# Environment Topology

- **Local**: Docker Compose running Postgres, Redis, and local services.
- **Development**: Shared development cluster for active branch integration.
- **Staging**: Production-mirror environment with sanitized synthetic data.
- **Production**: Multi-AZ AWS deployment.
