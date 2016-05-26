package manager

import (
	"fmt"

	log "github.com/Sirupsen/logrus"
	"github.com/samalba/dockerclient"
	"github.com/shipyard/shipyard/model"
	"github.com/shipyard/shipyard/utils"
)

type (
	EventHandler struct {
		Manager Manager
	}
)

func (h *EventHandler) Handle(e *dockerclient.Event) error {
	log.Infof("event: date=%d status=%s container=%s", e.Time, e.Status, e.Id[:12])
	h.logDockerEvent(e)
	return nil
}

func (h *EventHandler) logDockerEvent(e *dockerclient.Event) error {
	info, err := h.Manager.Container(e.Id)
	if err != nil {
		return err
	}

	ts, err := utils.FromUnixTimestamp(e.Time)
	if err != nil {
		return err
	}

	evt := &model.Event{
		Type: e.Status,
		Message: fmt.Sprintf("action=%s container=%s",
			e.Status, e.Id[:12]),
		Time:          *ts,
		ContainerInfo: info,
		Tags:          []string{"docker"},
	}
	if err := h.Manager.SaveEvent(evt); err != nil {
		return err
	}
	return nil
}
