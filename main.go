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

type Student struct {
	ID     interface{} `json:"id,omitempty" bson:"_id,omitempty"`
	Name   string      `json:"name" bson:"name"`
	Course string      `json:"course" bson:"course"`
	Year   int         `json:"year" bson:"year"`
	GPA    float64     `json:"gpa" bson:"gpa"`
}

func main() {
	e := echo.New()
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// --- DATABASE CONNECTION ---
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI("mongodb://mongodb:27017"))
	if err != nil {
		e.Logger.Fatal(err)
	}

	// Ping the database to verify connection and use the 'ctx' variable
	err = client.Ping(ctx, nil)
	if err != nil {
		e.Logger.Fatal("Database unreachable: ", err)
	}

	db := client.Database("school_db")
	studentsColl := db.Collection("students")
	usersColl := db.Collection("users")
	// --- END DATABASE CONNECTION ---

	e.Static("/static", "static")
	e.File("/", "static/index.html")

	// --- AUTH ROUTES ---
	e.POST("/signup", func(c echo.Context) error {
		u := new(User)
		if err := c.Bind(u); err != nil {
			return err
		}
		hashed, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 10)
		u.Password = string(hashed)
		usersColl.InsertOne(c.Request().Context(), u)
		return c.JSON(http.StatusCreated, "Admin Created")
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

	// --- STUDENT ROUTES ---
	e.GET("/students", func(c echo.Context) error {
		// Initialize s as an empty slice so it never returns 'null'
		s := []Student{}

		cur, err := studentsColl.Find(c.Request().Context(), map[string]interface{}{})
		if err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to query database"})
		}
		defer cur.Close(c.Request().Context())

		if err := cur.All(c.Request().Context(), &s); err != nil {
			return c.JSON(http.StatusInternalServerError, map[string]string{"error": "Failed to decode data"})
		}

		return c.JSON(http.StatusOK, s)
	})

	e.POST("/students", func(c echo.Context) error {
		s := new(Student)
		if err := c.Bind(s); err != nil {
			return c.JSON(http.StatusBadRequest, "Invalid Data")
		}
		studentsColl.InsertOne(c.Request().Context(), s)
		return c.JSON(http.StatusCreated, s)
	})

	e.DELETE("/students/:name", func(c echo.Context) error {
		name := c.Param("name")
		studentsColl.DeleteOne(c.Request().Context(), map[string]string{"name": name})
		return c.NoContent(http.StatusNoContent)
	})

	e.Logger.Fatal(e.Start(":8080"))
}
