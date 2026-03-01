package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v2"
	_ "github.com/microsoft/go-mssqldb"
)

var db *sql.DB
var validate *validator.Validate

func initDB() {
	var err error
	connString := os.Getenv("DATABASE_URL")
	if connString == "" {
		host := os.Getenv("DATABASE_HOST")
		user := os.Getenv("DATABASE_USER")
		password := os.Getenv("DATABASE_PASSWORD")
		dbName := os.Getenv("DATABASE_NAME")
		if host != "" && user != "" && password != "" && dbName != "" {
			connString = fmt.Sprintf("sqlserver://%s:%s@%s?database=%s", user, password, host, dbName)
		} else {
			log.Fatal("DATABASE_URL or proper individual DB env vars are required")
		}
	}

	db, err = sql.Open("sqlserver", connString)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}

	maxIdleConns := getEnvInt("DATABASE_MAX_IDLE_CONNS", 128)
	maxOpenConns := getEnvInt("DATABASE_MAX_OPEN_CONNS", 128)
	connMaxLifetime := getEnvInt("DATABASE_CONN_MAX_LIFETIME_SEC", 30)

	db.SetMaxIdleConns(maxIdleConns)
	db.SetMaxOpenConns(maxOpenConns)
	db.SetConnMaxLifetime(time.Duration(connMaxLifetime) * time.Second)

	if err := db.Ping(); err != nil {
		log.Fatalf("Error connecting to the database: %v", err)
	}

	log.Println("Connected to MSSQL database")
}

func getEnvInt(key string, defaultVal int) int {
	valStr := os.Getenv(key)
	if valStr == "" {
		return defaultVal
	}
	val, err := strconv.Atoi(valStr)
	if err != nil {
		return defaultVal
	}
	return val
}

func main() {
	initDB()
	defer db.Close()

	validate = validator.New()

	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
	})

	// /plaintext
	app.Get("/plaintext", func(c *fiber.Ctx) error {
		return c.SendString("Hello, World!")
	})

	// /json-serialization
	app.Get("/json-serialization", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello, World!"})
	})

	// /read-one
	type ReadOneQuery struct {
		ID int `query:"id" validate:"required"`
	}
	app.Get("/read-one", func(c *fiber.Ctx) error {
		var q ReadOneQuery
		if err := c.QueryParser(&q); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(q); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		var id, randomNumber int
		err := db.QueryRowContext(c.Context(), "SELECT id, randomNumber FROM World WHERE id = @p1", q.ID).Scan(&id, &randomNumber)
		if err != nil {
			if err == sql.ErrNoRows {
				return c.SendStatus(fiber.StatusNotFound)
			}
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.JSON(fiber.Map{"id": id, "randomNumber": randomNumber})
	})

	// /read-many
	type ReadManyQuery struct {
		Limit  int `query:"limit"`
		Offset int `query:"offset"`
	}
	app.Get("/read-many", func(c *fiber.Ctx) error {
		var q ReadManyQuery
		if err := c.QueryParser(&q); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if q.Limit == 0 {
			q.Limit = 20
		}

		rows, err := db.QueryContext(c.Context(), "SELECT id, randomNumber FROM World ORDER BY id OFFSET @p1 ROWS FETCH NEXT @p2 ROWS ONLY", q.Offset, q.Limit)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer rows.Close()

		worlds := make([]map[string]interface{}, 0)
		for rows.Next() {
			var id, randomNumber int
			if err := rows.Scan(&id, &randomNumber); err != nil {
				return c.SendStatus(fiber.StatusInternalServerError)
			}
			worlds = append(worlds, map[string]interface{}{"id": id, "randomNumber": randomNumber})
		}
		return c.JSON(worlds)
	})

	// /create-one
	type CreateOneBody struct {
		RandomNumber int `json:"randomNumber" validate:"required"`
	}
	app.Post("/create-one", func(c *fiber.Ctx) error {
		var b CreateOneBody
		if err := c.BodyParser(&b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		_, err := db.ExecContext(c.Context(), "INSERT INTO Temp (randomNumber) VALUES (@p1)", b.RandomNumber)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusCreated)
	})

	// /create-many
	type CreateManyItem struct {
		RandomNumber int `json:"randomNumber" validate:"required"`
	}
	type CreateManyBody struct {
		Items []CreateManyItem `json:"items" validate:"required,gt=0,dive"`
	}
	app.Post("/create-many", func(c *fiber.Ctx) error {
		var b CreateManyBody
		if err := c.BodyParser(&b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		tx, err := db.BeginTx(context.Background(), nil)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer tx.Rollback()

		stmt, err := tx.Prepare("INSERT INTO Temp (randomNumber) VALUES (@p1)")
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer stmt.Close()

		for _, item := range b.Items {
			if _, err := stmt.Exec(item.RandomNumber); err != nil {
				return c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		if err := tx.Commit(); err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusCreated)
	})

	// /update-one/:id
	type UpdateOneParams struct {
		ID int `params:"id" validate:"required"`
	}
	type UpdateOneBody struct {
		RandomNumber int `json:"randomNumber" validate:"required"`
	}
	app.Patch("/update-one/:id", func(c *fiber.Ctx) error {
		var p UpdateOneParams
		if err := c.ParamsParser(&p); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(p); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		var b UpdateOneBody
		if err := c.BodyParser(&b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		_, err := db.ExecContext(c.Context(), "UPDATE World SET randomNumber = @p1 WHERE id = @p2", b.RandomNumber, p.ID)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	// /update-many
	type UpdateManyItem struct {
		ID           int `json:"id" validate:"required"`
		RandomNumber int `json:"randomNumber" validate:"required"`
	}
	type UpdateManyBody struct {
		Items []UpdateManyItem `json:"items" validate:"required,gt=0,dive"`
	}
	app.Put("/update-many", func(c *fiber.Ctx) error {
		var b UpdateManyBody
		if err := c.BodyParser(&b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		if len(b.Items) == 0 {
			return c.SendStatus(fiber.StatusOK)
		}

		query := "UPDATE World SET randomNumber = CASE id "
		args := make([]interface{}, 0, len(b.Items)*2)
		inClause := make([]string, 0, len(b.Items))

		for i, item := range b.Items {
			query += fmt.Sprintf("WHEN @p%d THEN @p%d ", i*2+1, i*2+2)
			args = append(args, item.ID, item.RandomNumber)
			inClause = append(inClause, fmt.Sprintf("@p%d", i*2+1))
		}
		query += "END WHERE id IN (" + strings.Join(inClause, ", ") + ")"

		_, err := db.ExecContext(c.Context(), query, args...)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusOK)
	})

	// /delete-one/:id
	type DeleteOneParams struct {
		ID int `params:"id" validate:"required"`
	}
	app.Delete("/delete-one/:id", func(c *fiber.Ctx) error {
		var p DeleteOneParams
		if err := c.ParamsParser(&p); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(p); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		_, err := db.ExecContext(c.Context(), "DELETE FROM Temp WHERE id = @p1", p.ID)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	// /delete-many
	type DeleteManyBody struct {
		IDs []int `json:"ids" validate:"required,gt=0"`
	}
	app.Delete("/delete-many", func(c *fiber.Ctx) error {
		var b DeleteManyBody
		if err := c.BodyParser(&b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}
		if err := validate.Struct(b); err != nil {
			return c.SendStatus(fiber.StatusBadRequest)
		}

		tx, err := db.BeginTx(context.Background(), nil)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer tx.Rollback()

		stmt, err := tx.Prepare("DELETE FROM Temp WHERE id = @p1")
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer stmt.Close()

		for _, id := range b.IDs {
			if _, err := stmt.Exec(id); err != nil {
				return c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		if err := tx.Commit(); err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendStatus(fiber.StatusNoContent)
	})

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("Starting server on port %s...\n", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
