import * as express from "express";
import * as cors from "cors";
import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { Product } from "./entity/product";
import { console } from "inspector";
import * as amqp from "amqplib/callback_api";

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

    amqp.connect(
      "amqps://iktihfel:jHZrROaimeQw-oO7GKEoV_jW75YmuVyY@horse.lmq.cloudamqp.com/iktihfel",
      (error0, connection) => {
        if (error0) {
          throw error0;
        }

        connection.createChannel((error1, channel) => {
          if (error1) {
            throw error1;
          }

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
            channel.sendToQueue(
              "product_created",
              Buffer.from(JSON.stringify(result))
            );
            res.send(result);
          });

          app.get(
            "/api/products/:id",
            async (req: Request<{ id: string }>, res: Response) => {
              try {
                const product = await productRepository.findOne({
                  where: { id: parseInt(req.params.id, 10) }, // Convert string to number
                });

                if (!product) {
                  res.status(404).json({ message: "Product not found" });
                }

                res.send(product);
              } catch (error) {
                console.error("Error fetching product:", error);
                res.status(500).json({ message: "Internal Server Error" });
              }
            }
          );

          app.put(
            "/api/products/:id",
            async (req: Request<{ id: string }>, res: Response) => {
              try {
                const product = await productRepository.findOne({
                  where: { id: parseInt(req.params.id, 10) }, // Convert string to number
                });
                productRepository.merge(product, req.body);
                const result = await productRepository.save(product);
                channel.sendToQueue(
                  "product_updated",
                  Buffer.from(JSON.stringify(result))
                );
                res.send(result);
              } catch (error) {
                console.error("Error Putting Product", error);
                res.status(500).json({ message: "Internal Server Error" });
              }
            }
          );

          app.delete(
            "/api/products/:id",
            async (req: Request, res: Response) => {
              const productId = parseInt(req.params.id, 10);
              const result = await productRepository.delete(productId);
              channel.sendToQueue(
                "product_deleted",
                Buffer.from(JSON.stringify({ id: productId }))
              );
              res.send(result);
            }
          );

          app.post(
            "/api/products/:id/like",
            async (req: Request<{ id: string }>, res: Response) => {
              try {
                const product = await productRepository.findOne({
                  where: { id: parseInt(req.params.id, 10) }, // Convert string to number
                });
                product.likes++;
                const result = await productRepository.save(product);
                res.send(result);
              } catch (error) {
                console.error("Error fetching id", error);
                res.status(500).json({ message: "Internal Server Error" });
              }
            }
          );

          // Cast options to PostgresConnectionOptions
          const options = AppDataSource.options as PostgresConnectionOptions;

          console.log("Database:", options.database);
          console.log("Host:", options.host);

          console.log("Listening to port: 8000");
          app.listen(8000);
          process.on("beforeExit", () => {
            console.log("closing");
            connection.close();
          });
        });
      }
    );
  })
  .catch((error) => {
    console.error("Error connecting to the database:", error);
  });
