export class MidiService {
  private midiAccess: MIDIAccess | null = null;
  private onNoteOnCallback: ((midiNumber: number) => void) | null = null;
  private onNoteOffCallback: ((midiNumber: number) => void) | null = null;
  private onConnectionChangeCallback: ((isConnected: boolean) => void) | null = null;
  private isInitializing = false;

  async initialize(
    onNoteOn: (midi: number) => void,
    onConnectionChange?: (isConnected: boolean) => void,
    onNoteOff?: (midi: number) => void
  ): Promise<void> {
    // Update callbacks immediately so they are fresh
    this.onNoteOnCallback = onNoteOn;
    this.onNoteOffCallback = onNoteOff ?? null;
    this.onConnectionChangeCallback = onConnectionChange ?? null;

    // If we already have access, just ensure inputs are bound and status is updated
    if (this.midiAccess) {
      this.updateConnectionStatus();
      this.bindInputs();
      return;
    }

    if (this.isInitializing) return;
    this.isInitializing = true;

    if (!navigator.requestMIDIAccess) {
      return;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      
      this.updateConnectionStatus();
      this.bindInputs();

      // Handle hot-plugging
      this.midiAccess.onstatechange = (e: MIDIConnectionEvent) => {
        this.updateConnectionStatus();
        if (e.port && e.port.type === 'input' && e.port.state === 'connected') {
          this.bindInput(e.port as MIDIInput);
        }
      };
    } catch (err) {
      console.error("MIDI Access failed", err);
    } finally {
      this.isInitializing = false;
    }
  }

  private bindInputs() {
    if (!this.midiAccess) return;
    const inputs = this.midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
      this.bindInput(input.value);
    }
  }

  private bindInput(input: MIDIInput) {
    // Re-binding is safe, it just replaces the handler
    input.onmidimessage = this.handleMidiMessage.bind(this);
  }

  private updateConnectionStatus() {
    if (!this.midiAccess) return;
    // Check if we have any input ports
    const hasInputs = this.midiAccess.inputs.size > 0;
    this.onConnectionChangeCallback?.(hasInputs);
  }

  private handleMidiMessage(event: MIDIMessageEvent) {
    if (!event.data) return;
    const [command, note, velocity] = event.data;

    const commandType = command & 0xF0;
    const isNoteOn = commandType === 0x90 && velocity > 0;
    const isNoteOff = commandType === 0x80 || (commandType === 0x90 && velocity === 0);

    if (isNoteOn) {
      this.onNoteOnCallback?.(note);
    } else if (isNoteOff) {
      this.onNoteOffCallback?.(note);
    }
  }
}
