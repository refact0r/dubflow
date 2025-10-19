/**
 * Dubs character state management
 * Controls the mascot's animations and behavior
 */

export class DubsStore {
	// Current animation state of Dubs character (corresponds to GIF filename without extension)
	// Available states (just use the GIF filename without .gif):
	// - 'dubs_sleeping': User is focused, Dubs is asleep
	// - 'dubs_waking_up': Transition state when distraction is detected
	// - 'dubs_light_bark': Mildly concerned, light barking
	// - 'dubs_heavy_bark': Heavily barking, user is very distracted
	// - 'dubs_barking_normal': Normal bark animation
	// - 'dubs_default_stance': Default neutral stance
	// - 'dubs_half_sleep': Half asleep state
	// - 'dubs_to_sleep': Transition to sleeping
	state = $state('dubs_sleeping');

	overlayVisible = $state(true); // Whether the overlay window is visible on screen

	constructor() {
		if (typeof window !== 'undefined' && window.electronAPI) {
			window.electronAPI.onDubsStateChange((state) => {
				this.state = state;
			});
		}
	}

	setState(newState) {
		this.state = newState;
		if (window.electronAPI) {
			window.electronAPI.setDubsState(newState);
		}
	}

	toggleOverlay() {
		this.overlayVisible = !this.overlayVisible;
		if (window.electronAPI) {
			window.electronAPI.toggleOverlay(this.overlayVisible);
		}
	}

	// Simply append .gif to the state name to get the filename
	get spriteFile() {
		return `dubs/${this.state}.gif`;
	}
}

// Create singleton instance
export const dubsStore = new DubsStore();
