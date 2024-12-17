import * as express from "express";
import * as cors from "cors";
import { Request, Response } from "express";
import { DataSource } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import * as amqp from "amqplib/callback_api";
import { Product } from "./entity/product";
import axios from "axios";

const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "2001",
  database: "IT109",
  synchronize: true,
  logging: true,
  entities: ["src/entity/*.js"],
});

AppDataSource.initialize()
  .then((db) => {
    console.log("Connection to Postgres was successful!");
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

          channel.assertQueue("product_created", { durable: false });
          channel.assertQueue("product_updated", { durable: false });
          channel.assertQueue("product_deleted", { durable: false });

          const app = express();

          app.use(express.json());

          channel.consume(
            "product_created",
            async (msg) => {
              const eventProduct = JSON.parse(msg.content.toString());
              const product = new Product();
              product.admin_id = parseInt(eventProduct.id);
              product.title = eventProduct.title;
              product.image = eventProduct.image;
              product.likes = eventProduct.likes;
              await productRepository.save(product);
              console.log("product created");
            },
            { noAck: true }
          );

          channel.consume(
            "product_updated",
            async (msg) => {
              const eventProduct = JSON.parse(msg.content.toString());
              const product = await productRepository.findOne({
                where: { admin_id: parseInt(eventProduct.id) },
              });
              productRepository.merge(product, {
                title: eventProduct.title,
                image: eventProduct.image,
                likes: eventProduct.likes,
              });
              await productRepository.save(product);
              console.log("product updated");
            },
            { noAck: true }
          );

          channel.consume("product_deleted", async (msg) => {
            const content = JSON.parse(msg.content.toString());
            const admin_id = content.id;
            await productRepository.delete({ admin_id });
            console.log("product deleted");
          });

          app.get("/api/products", async (req: Request, res: Response) => {
            const products = await productRepository.find();
            res.send(products);
          });

          app.post(
            "/api/products/:id/Like",
            async (req: Request, res: Response) => {
              const productId = parseInt(req.params.id, 10);

              // Validate product ID
              if (isNaN(productId)) {
                res.status(400).send({ error: "Invalid product ID" });
              }

              try {
                // Fetch product by ID
                const product = await productRepository.findOneBy({
                  id: productId,
                });

                // Handle non-existent product
                if (!product) {
                  res.status(404).send({ error: "Product not found" });
                }

                // Increment likes
                product.likes += 1;
                await productRepository.save(product);

                // Notify external service
                await axios.post(
                  `http://localhost:8000/api/products/${product.admin_id}/Like`,
                  {}
                );

                // Send updated product as response
                res.send(product);
              } catch (error) {
                console.error("Error processing like request:", error);
                res.status(500).send({ error: "An error occurred" });
              }
            }
          );

          // Cast options to PostgresConnectionOptions
          const options = AppDataSource.options as PostgresConnectionOptions;

          console.log("Database:", options.database);
          console.log("Host:", options.host);

          console.log("Listening to port: 8002");
          app.listen(8002);
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
