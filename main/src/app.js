"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var typeorm_1 = require("typeorm");
var amqp = require("amqplib/callback_api");
var product_1 = require("./entity/product");
var axios_1 = require("axios");
var AppDataSource = new typeorm_1.DataSource({
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
    .then(function (db) {
    console.log("Connection to Postgres was successful!");
    var productRepository = db.getRepository(product_1.Product);
    amqp.connect("amqps://iktihfel:jHZrROaimeQw-oO7GKEoV_jW75YmuVyY@horse.lmq.cloudamqp.com/iktihfel", function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }
            channel.assertQueue("product_created", { durable: false });
            channel.assertQueue("product_updated", { durable: false });
            channel.assertQueue("product_deleted", { durable: false });
            var app = express();
            app.use(express.json());
            channel.consume("product_created", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
                var eventProduct, product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            eventProduct = JSON.parse(msg.content.toString());
                            product = new product_1.Product();
                            product.admin_id = parseInt(eventProduct.id);
                            product.title = eventProduct.title;
                            product.image = eventProduct.image;
                            product.likes = eventProduct.likes;
                            return [4 /*yield*/, productRepository.save(product)];
                        case 1:
                            _a.sent();
                            console.log("product created");
                            return [2 /*return*/];
                    }
                });
            }); }, { noAck: true });
            channel.consume("product_updated", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
                var eventProduct, product;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            eventProduct = JSON.parse(msg.content.toString());
                            return [4 /*yield*/, productRepository.findOne({
                                    where: { admin_id: parseInt(eventProduct.id) },
                                })];
                        case 1:
                            product = _a.sent();
                            productRepository.merge(product, {
                                title: eventProduct.title,
                                image: eventProduct.image,
                                likes: eventProduct.likes,
                            });
                            return [4 /*yield*/, productRepository.save(product)];
                        case 2:
                            _a.sent();
                            console.log("product updated");
                            return [2 /*return*/];
                    }
                });
            }); }, { noAck: true });
            channel.consume("product_deleted", function (msg) { return __awaiter(void 0, void 0, void 0, function () {
                var content, admin_id;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            content = JSON.parse(msg.content.toString());
                            admin_id = content.id;
                            return [4 /*yield*/, productRepository.delete({ admin_id: admin_id })];
                        case 1:
                            _a.sent();
                            console.log("product deleted");
                            return [2 /*return*/];
                    }
                });
            }); });
            app.get("/api/products", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
                var products;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, productRepository.find()];
                        case 1:
                            products = _a.sent();
                            res.send(products);
                            return [2 /*return*/];
                    }
                });
            }); });
            app.post("/api/products/:id/Like", function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
                var productId, product, error_1;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            productId = parseInt(req.params.id, 10);
                            // Validate product ID
                            if (isNaN(productId)) {
                                res.status(400).send({ error: "Invalid product ID" });
                            }
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 5, , 6]);
                            return [4 /*yield*/, productRepository.findOneBy({
                                    id: productId,
                                })];
                        case 2:
                            product = _a.sent();
                            // Handle non-existent product
                            if (!product) {
                                res.status(404).send({ error: "Product not found" });
                            }
                            // Increment likes
                            product.likes += 1;
                            return [4 /*yield*/, productRepository.save(product)];
                        case 3:
                            _a.sent();
                            // Notify external service
                            return [4 /*yield*/, axios_1.default.post("http://localhost:8000/api/products/".concat(product.admin_id, "/Like"), {})];
                        case 4:
                            // Notify external service
                            _a.sent();
                            // Send updated product as response
                            res.send(product);
                            return [3 /*break*/, 6];
                        case 5:
                            error_1 = _a.sent();
                            console.error("Error processing like request:", error_1);
                            res.status(500).send({ error: "An error occurred" });
                            return [3 /*break*/, 6];
                        case 6: return [2 /*return*/];
                    }
                });
            }); });
            // Cast options to PostgresConnectionOptions
            var options = AppDataSource.options;
            console.log("Database:", options.database);
            console.log("Host:", options.host);
            console.log("Listening to port: 8002");
            app.listen(8002);
            process.on("beforeExit", function () {
                console.log("closing");
                connection.close();
            });
        });
    });
})
    .catch(function (error) {
    console.error("Error connecting to the database:", error);
});
