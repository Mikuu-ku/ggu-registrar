package main

import (
	"context"
	"net/http"
	"time"

	"github.com/labstack/echo-contrib/prometheus"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.mongodb.org/mongo-driver/v2/bson"
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
}

func main() {
	e := echo.New()

	// Monitoring Setup
	p := prometheus.NewPrometheus("echo", nil)
	p.Use(e)

	e.Use(middleware.Logger())
	e.Use(middleware.Recover())

	// Database Connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Using the URI compatible with your Docker Compose setup
	client, err := mongo.Connect(options.Client().ApplyURI("mongodb://mongodb:27017"))
	if err != nil {
		e.Logger.Fatal(err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		e.Logger.Fatal("Database unreachable: ", err)
	}

	db := client.Database("school_db")
	studentsColl := db.Collection("students")
	usersColl := db.Collection("users")

	seedAdmin(usersColl)

	// Serve static files from the /static folder
	e.Static("/static", "static")
	e.File("/", "static/index.html")

	// --- AUTH ROUTES ---
	e.POST("/login", func(c echo.Context) error {
		u := new(User)
		if err := c.Bind(u); err != nil {
			return c.JSON(http.StatusBadRequest, "Invalid Data")
		}
		var stored User
		err := usersColl.FindOne(c.Request().Context(), bson.M{"username": u.Username}).Decode(&stored)
		if err != nil {
			return c.JSON(http.StatusUnauthorized, "Invalid Credentials")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(stored.Password), []byte(u.Password)); err != nil {
			return c.JSON(http.StatusUnauthorized, "Invalid Credentials")
		}
		return c.JSON(http.StatusOK, map[string]string{"message": "Login Successful"})
	})

	// --- STUDENT CRUD ---
	e.GET("/students", func(c echo.Context) error {
		var s []Student
		cur, _ := studentsColl.Find(c.Request().Context(), bson.M{})
		cur.All(c.Request().Context(), &s)
		return c.JSON(http.StatusOK, s)
	})

	e.POST("/students", func(c echo.Context) error {
		s := new(Student)
		if err := c.Bind(s); err != nil {
			return c.JSON(http.StatusBadRequest, "Invalid JSON")
		}
		// Ensure Year is set if not provided by UI
		if s.Year == 0 {
			s.Year = 1
		}

		studentsColl.InsertOne(c.Request().Context(), s)
		return c.JSON(http.StatusCreated, s)
	})

	e.DELETE("/students/:name", func(c echo.Context) error {
		name := c.Param("name")
		studentsColl.DeleteOne(c.Request().Context(), bson.M{"name": name})
		return c.NoContent(http.StatusNoContent)
	})

	e.Logger.Fatal(e.Start(":8080"))
}

func seedAdmin(coll *mongo.Collection) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	count, _ := coll.CountDocuments(ctx, bson.M{"username": "admin"})
	if count == 0 {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 10)
		admin := User{Username: "admin", Password: string(hashed)}
		coll.InsertOne(ctx, admin)
	}
}
