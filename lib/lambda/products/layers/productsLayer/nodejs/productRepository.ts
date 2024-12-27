import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { v4 as uuid } from "uuid";

export interface Product {
  id: string;
  productName: string;
  code: string;
  price: number;
  model: string;
  productUrl: string;
}

export class ProductRepository {
  private ddbClient: DocumentClient;
  private productsDdb: string;

  constructor(ddbCliente: DocumentClient, productsDdb: string) {
    this.ddbClient = ddbCliente;
    this.productsDdb = productsDdb;
  }

  async getAllProducts(): Promise<Product[]> {
    try {
      const data = await this.ddbClient
        .scan({
          TableName: this.productsDdb,
        })
        .promise();

      return (data.Items as Product[]) || [];
    } catch (error) {
      console.error("Error fetching all products:", error);
      throw new Error("Could not fetch products");
    }
  }

  async getProductById(productId: string): Promise<Product> {
    if (!productId) {
      throw new Error("Product ID is required");
    }
    try {
      const data = await this.ddbClient
        .get({
          TableName: this.productsDdb,
          Key: {
            id: productId,
          },
        })
        .promise();

      if (data.Item) {
        return data.Item as Product;
      } else {
        throw new Error(`Product with ID ${productId} not found`);
      }
    } catch (error) {
      console.error(`Error fetching product with ID ${productId}:`, error);
      throw new Error("Could not fetch product");
    }
  }

  async createProduct(product: Product): Promise<Product> {
    if (!product) {
      throw new Error("Product is required");
    }
    try {
      product.id = uuid();
      await this.ddbClient
        .put({
          TableName: this.productsDdb,
          Item: product,
        })
        .promise();
      return product;
    } catch (error) {
      console.error("Error when trying to create the product with the data:", product);
      console.error("Error message:", error);
      throw new Error("Could not create product");
    }
  }

  async updateProduct(productId: string, product: Product): Promise<Product> {
    if (!productId || !product) {
      throw new Error("Product ID and Product are required");
    }
    try {
      const data = await this.ddbClient
        .update({
          TableName: this.productsDdb,
          Key: {
            id: productId,
          },
          ConditionExpression: "attribute_exists(id)", //verifica se o id do elemento consta na tabela, caso conste a operação update sera executada
          ReturnValues: "UPDATED_NEW",
          UpdateExpression: "set productName = :n, code = :c, price = :p, model = :m, productUrl = :u",
          ExpressionAttributeValues: {
            ":n": product.productName,
            ":c": product.code,
            ":p": product.price,
            ":m": product.model,
            ":u": product.productUrl,
          },
        })
        .promise();
      if (data.Attributes) {
        data.Attributes.id = productId;
        return data.Attributes as Product;
      } else {
        throw new Error(`Product with ID ${productId} not found`);
      }
    } catch (error) {
      console.error("Error when trying to create the product with the data:", product);
      console.error("Error message:", error);
      throw new Error("Could not create product");
    }
  }

  async deleteProduct(productId: string): Promise<Product> {
    if (!productId) {
      throw new Error("Product ID is required");
    }
    try {
      const data = await this.ddbClient
        .delete({
          TableName: this.productsDdb,
          Key: {
            id: productId,
          },
          ReturnValues: "ALL_OLD",
        })
        .promise();

      if (data.Attributes) {
        return data.Attributes as Product;
      } else {
        throw new Error(`Product with ID ${productId} not found`);
      }
    } catch (error) {
      console.error(`Error when trying to delete resource ${productId}:`, error);
      throw new Error("Could not delete product");
    }
  }
}
