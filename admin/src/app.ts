import * as express from "express";
import * as cors from "cors";
import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { Product } from "./entity/product";
import { console } from "inspector";

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "2001",
  database: "it109",
  synchronize: true,
  logging: false,
  entities: ["src/entity/*.js"],
});

AppDataSource.initialize()
  .then((db) => {
    console.log("Connection to PostgreSQL was successful!");
    const productRepository = db.getRepository(Product);
    const app = express();

    app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:8080",
          "http://localhost:4200",
        ],
      })
    );

    app.use(express.json());

    app.get("/api/products", async (req: Request, res: Response) => {
      const products = await productRepository.find();
      res.json(products);
    });

    app.post("/api/products", async (req: Request, res: Response) => {
      const product = productRepository.create(req.body);
      const result = await productRepository.save(product);
      res.send(result);
    });

    // Cast options to PostgresConnectionOptions
    const options = AppDataSource.options as PostgresConnectionOptions;

    console.log("Database:", options.database);
    console.log("Host:", options.host);

    console.log("Listening to port: 8000");
    app.listen(8000);
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });
