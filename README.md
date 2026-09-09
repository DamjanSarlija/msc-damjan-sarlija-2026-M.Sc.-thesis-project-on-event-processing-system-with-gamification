1. Package/dependency installation: npm install
2. Add a DATABASE_URL environment variable into env.example file
3. Create a database table using:

      CREATE TABLE podaci(
      	id SERIAL PRIMARY KEY,
      	event_id UUID UNIQUE,
      	device_id TEXT,
      	event_type TEXT,
      	profile TEXT,
      	scenario TEXT,
      	generated_at TIMESTAMPTZ,
      	saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      	value INTEGER
      )

4. Simulator usage:
   4.1. Run a Docker environment (e.g. Docker Desktop) - needed for NATS server
   4.2. Run a NATS server: docker run -p 4222:4222 --name nats-dev --rm nats
   4.3. Run a device gateway: node deovice_gateway.js
   4.4. Run a data processor: node data_processor.js
   4.5. Run a frontend gateway: node frontend_gateway.js
   4.6. Open a webiste: http://localhost:3000
   4.7. Run a device simulator: python scenario_runner.py --devices <no_of_devices> --scenario ./scenarios/<scenario>.json
