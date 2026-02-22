package main

import (
	"database/sql"
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/lib/pq"
)

type World struct {
	Id           int `json:"id"`
	RandomNumber int `json:"randomNumber"`
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:benchmark@postgres-service:5432/benchmark?sslmode=disable"
	}
	if !strings.Contains(dbURL, "sslmode=") {
		if strings.Contains(dbURL, "?") {
			dbURL += "&sslmode=disable"
		} else {
			dbURL += "?sslmode=disable"
		}
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Optimize connection pool
	maxConns := 100
	if maxConnsEnv := os.Getenv("MAX_DB_CONNECTIONS"); maxConnsEnv != "" {
		if val, err := strconv.Atoi(maxConnsEnv); err == nil {
			maxConns = val
		}
	}
	db.SetMaxOpenConns(maxConns)
	db.SetMaxIdleConns(maxConns)

	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
	})

	app.Get("/plaintext", func(c *fiber.Ctx) error {
		return c.SendString("Hello World!")
	})

	app.Get("/json", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello World!"})
	})

	app.Get("/database/single-read", func(c *fiber.Ctx) error {
		idStr := c.Query("id", "1")
		id, _ := strconv.Atoi(idStr)

		var w World
		err := db.QueryRow("SELECT id, randomnumber FROM World WHERE id = $1", id).Scan(&w.Id, &w.RandomNumber)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.JSON(w)
	})

	app.Get("/database/multiple-read", func(c *fiber.Ctx) error {
		limitStr := c.Query("limit", "20")
		offsetStr := c.Query("offset", "0")
		limit, _ := strconv.Atoi(limitStr)
		offset, _ := strconv.Atoi(offsetStr)

		rows, err := db.Query("SELECT id, randomnumber FROM World LIMIT $1 OFFSET $2", limit, offset)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer rows.Close()

		worlds := []World{}
		for rows.Next() {
			var w World
			if err := rows.Scan(&w.Id, &w.RandomNumber); err != nil {
				return c.SendStatus(fiber.StatusInternalServerError)
			}
			worlds = append(worlds, w)
		}
		return c.JSON(worlds)
	})

	app.Get("/database/single-write", func(c *fiber.Ctx) error {
		idStr := c.Query("id", "1")
		rnStr := c.Query("randomNumber", "1")
		id, _ := strconv.Atoi(idStr)
		rn, _ := strconv.Atoi(rnStr)

		var w World
		err := db.QueryRow("SELECT id, randomnumber FROM World WHERE id = $1", id).Scan(&w.Id, &w.RandomNumber)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		_, err = db.Exec("UPDATE World SET randomnumber = $1 WHERE id = $2", rn, id)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}

		w.RandomNumber = rn
		return c.JSON(w)
	})

	app.Get("/database/multiple-write", func(c *fiber.Ctx) error {
		limitStr := c.Query("limit", "20")
		offsetStr := c.Query("offset", "0")
		limit, _ := strconv.Atoi(limitStr)
		offset, _ := strconv.Atoi(offsetStr)

		rParam := c.Query("r")
		rVals := strings.Split(rParam, ",")

		rows, err := db.Query("SELECT id, randomnumber FROM World LIMIT $1 OFFSET $2", limit, offset)
		if err != nil {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		defer rows.Close()

		worlds := []World{}
		ids := []int{}
		for rows.Next() {
			var w World
			if err := rows.Scan(&w.Id, &w.RandomNumber); err != nil {
				return c.SendStatus(fiber.StatusInternalServerError)
			}
			worlds = append(worlds, w)
			ids = append(ids, w.Id)
		}

		rns := make([]int, len(ids))
		for i := range worlds {
			rn := 1
			if i < len(rVals) {
				rn, _ = strconv.Atoi(rVals[i])
			}
			worlds[i].RandomNumber = rn
			rns[i] = rn
		}

		if len(ids) > 0 {
			// Batch update using unnest
			_, err = db.Exec("UPDATE World SET randomnumber = u.rn FROM unnest($1::int[], $2::int[]) AS u(id, rn) WHERE World.id = u.id",
				pq.Array(ids), pq.Array(rns))
			if err != nil {
				log.Printf("Batch update error: %v", err)
				return c.SendStatus(fiber.StatusInternalServerError)
			}
		}

		return c.JSON(worlds)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	app.Listen(":" + port)
}
