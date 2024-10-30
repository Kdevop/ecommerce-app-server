CREATE TABLE IF NOT EXISTS "user" (
	"Password" text NOT NULL,
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"Email" text NOT NULL UNIQUE,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "billing_address" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"user_id" bigint NOT NULL,
	"address_line1" varchar NOT NULL,
	"address_line2" varchar NOT NULL,
	"city" varchar NOT NULL,
	"county" varchar NOT NULL,
	"post_code" varchar(9) NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "products" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category_id" bigint NOT NULL,
	"price" money NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "categories" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"name" text NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "cart_products" (
	"cart_id" bigint  UNIQUE,
	"product_id" bigint NOT NULL,
	"quantity" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "cart" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"user_id" bigint NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "checkout" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"payment_method" bigint NOT NULL,
	"billing_address_id" bigint NOT NULL,
	"shipping_address_id" bigint NOT NULL,
	"total_amount" money NOT NULL,
	"checkout_date" date NOT NULL,
	"checkout_status" text NOT NULL,
	"cart_id" bigint NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shipping_address" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"user_id" bigint NOT NULL,
	"address_line1" varchar NOT NULL,
	"address_line2" varchar NOT NULL,
	"city" varchar NOT NULL,
	"county" varchar NOT NULL,
	"post_code" varchar(9) NOT NULL,
	PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "orders" (
	"id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL UNIQUE,
	"user_id" bigint NOT NULL,
	"order_date" date NOT NULL,
	"order_status" text NOT NULL,
	"checkout_id" bigint NOT NULL,
	PRIMARY KEY ("id")
);


ALTER TABLE "billing_address" ADD CONSTRAINT "billing_address_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("id");
ALTER TABLE "products" ADD CONSTRAINT "products_fk3" FOREIGN KEY ("category_id") REFERENCES "categories"("id");

ALTER TABLE "cart_products" ADD CONSTRAINT "cart_products_fk0" FOREIGN KEY ("cart_id") REFERENCES "cart"("id");

ALTER TABLE "cart_products" ADD CONSTRAINT "cart_products_fk1" FOREIGN KEY ("product_id") REFERENCES "products"("id");
ALTER TABLE "cart" ADD CONSTRAINT "cart_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("id");
ALTER TABLE "checkout" ADD CONSTRAINT "checkout_fk2" FOREIGN KEY ("billing_address_id") REFERENCES "billing_address"("id");

ALTER TABLE "checkout" ADD CONSTRAINT "checkout_fk3" FOREIGN KEY ("shipping_address_id") REFERENCES "shipping_address"("id");

ALTER TABLE "checkout" ADD CONSTRAINT "checkout_fk7" FOREIGN KEY ("cart_id") REFERENCES "cart"("id");
ALTER TABLE "shipping_address" ADD CONSTRAINT "shipping_address_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("id");
ALTER TABLE "orders" ADD CONSTRAINT "orders_fk1" FOREIGN KEY ("user_id") REFERENCES "user"("id");

ALTER TABLE "orders" ADD CONSTRAINT "orders_fk4" FOREIGN KEY ("checkout_id") REFERENCES "checkout"("id");