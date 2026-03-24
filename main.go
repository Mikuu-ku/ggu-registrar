package main

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	Username string `json:"username" bson:"username"`
	Password string `json:"password" bson:"password"`
}

type Product struct {
	Name     string  `json:"name" bson:"name"`
	Price    float64 `json:"price" bson:"price"`
	ImageURL string  `json:"image_url" bson:"image_url"`
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// FIX: Use ctx to verify the connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI("mongodb://mongodb:27017"))
	if err != nil {
		e.Logger.Fatal(err)
	}

	// This utilizes 'ctx', satisfying the compiler
	err = client.Ping(ctx, nil)
	if err != nil {
		e.Logger.Fatal("Database unreachable:", err)
	}

	db := client.Database("ua_store")
	productsColl := db.Collection("products")
	usersColl := db.Collection("users")

	e.Static("/static", "static")
	e.File("/", "static/index.html")

	e.POST("/signup", func(c echo.Context) error {
		u := new(User)
		if err := c.Bind(u); err != nil {
			return err
		}
		hashed, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 10)
		u.Password = string(hashed)
		usersColl.InsertOne(c.Request().Context(), u)
		return c.JSON(http.StatusCreated, "Account Created")
	})

	e.POST("/login", func(c echo.Context) error {
		u := new(User)
		c.Bind(u)
		var stored User
		err := usersColl.FindOne(c.Request().Context(), map[string]string{"username": u.Username}).Decode(&stored)
		if err != nil || bcrypt.CompareHashAndPassword([]byte(stored.Password), []byte(u.Password)) != nil {
			return c.JSON(http.StatusUnauthorized, "ACCESS DENIED")
		}
		return c.JSON(http.StatusOK, map[string]bool{"admin": true})
	})

	e.GET("/products", func(c echo.Context) error {
		var p []Product
		cur, _ := productsColl.Find(c.Request().Context(), map[string]interface{}{})
		cur.All(c.Request().Context(), &p)
		return c.JSON(http.StatusOK, p)
	})

	e.POST("/products", func(c echo.Context) error {
		p := new(Product)
		c.Bind(p)
		productsColl.InsertOne(c.Request().Context(), p)
		return c.JSON(http.StatusCreated, p)
	})

	e.DELETE("/products/:name", func(c echo.Context) error {
		name := c.Param("name")
		productsColl.DeleteOne(c.Request().Context(), map[string]string{"name": name})
		return c.NoContent(http.StatusNoContent)
	})

	e.Logger.Fatal(e.Start(":8080"))
}
